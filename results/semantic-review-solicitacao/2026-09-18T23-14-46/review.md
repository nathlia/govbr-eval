# Revisão semântica — pacote fechado

Versão: flow-semantic-1.4.0 · 60 cartões únicos · 60 pendentes

## As três filas

| Fila | Quantidade | O que ela cobra |
|---|---|---|
| **Ativa — desta bateria** | 60 cartão(ões) | **Só esta fecha a bateria.** Enquanto houver um, as métricas são provisórias. |
| Histórica — de outras baterias | 0 | Dívida declarada do projeto. Não cobra nada desta bateria, e não some por isso. |
| Descobertas para a próxima referência | 0 afirmação(ões) | Defeito correto fora do gabarito congelado. Entra na PRÓXIMA versão; não mexe no denominador desta. |

Esforço: 105 sujeitos · 55 cartão(ões) sem evidência verificada · 40 com unidade candidata · estimativa **345 min** (3 min/cartão +3 sem evidência — DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui).

Nenhum orçamento de revisão foi declarado. Declare antes de começar — depois de ver os cartões já não é orçamento.

Esta renderização NÃO é cega: 47 cartão(ões) contêm texto que nomeia o braço da execução. Para decidir sem saber o braço, gere com `--cego`.

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

## C-01051902e18abce7965c16f87517675f257d9f027e32fbe184eb707e398b2c40

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botão que abre o calendário, com aria-label Abrir calendário e data-toggle, tem ao mesmo tempo aria-hidden=true e tabindex=-1, portanto não recebe foco nem existe para a tecnologia assistiva. O calendário também não abre ao focar nem ao acionar o campo #data-preferencial: .flatpickr-calendar continua com display none e sem a classe open. Assim, o calendário só é alcançável com o mouse, pelo próprio botão.

Esperado: A abertura do calendário deve ser operável por teclado: o botão deve ser focável e exposto, sem aria-hidden e sem tabindex=-1, ou o campo deve abrir o calendário por interação de teclado.

Janela: 1280×900 · interações desde o carregamento: 1. carregar a página 2. focar o campo Data preferencial 3. acionar o campo Data preferencial

Regra declarada: wcag:2.1.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(4)>div>div>div>button" — <button#data-preferencial-btn> "Abrir calendário" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: atributos do #data-preferencial-btn iguais a aria-label Abrir calendário, data-toggle, tabindex -1, aria-hidden true` → identificador devolvido por ferramenta (sem arquivo)
- `janela auxiliar p2: DT:1true-1` → identificador devolvido por ferramenta (sem arquivo)
- `janela auxiliar p2 após foco e acionamento do campo: OPEN:false/VIS:none/ACT:data-preferencial` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#data-preferencial-btn",
    "relatedSelectors": [
      "#data-preferencial",
      ".flatpickr-calendar"
    ],
    "rule": "wcag:2.1.1",
    "observed": "O botão que abre o calendário, com aria-label Abrir calendário e data-toggle, tem ao mesmo tempo aria-hidden=true e tabindex=-1, portanto não recebe foco nem existe para a tecnologia assistiva. O calendário também não abre ao focar nem ao acionar o campo #data-preferencial: .flatpickr-calendar continua com display none e sem a classe open. Assim, o calendário só é alcançável com o mouse, pelo próprio botão.",
    "expected": "A abertura do calendário deve ser operável por teclado: o botão deve ser focável e exposto, sem aria-hidden e sem tabindex=-1, ou o campo deve abrir o calendário por interação de teclado.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar a página",
        "focar o campo Data preferencial",
        "acionar o campo Data preferencial"
      ]
    },
    "evidence": [
      "browser_evaluate: atributos do #data-preferencial-btn iguais a aria-label Abrir calendário, data-toggle, tabindex -1, aria-hidden true",
      "janela auxiliar p2: DT:1true-1",
      "janela auxiliar p2 após foco e acionamento do campo: OPEN:false/VIS:none/ACT:data-preferencial"
    ]
  },
  "scope": [
    "tela inteira: barra superior, trilha de navegação, formulário Solicitar serviço e região Solicitações anteriores"
  ],
  "notes": "Execução sem oráculo de regras: nenhuma ferramenta de consulta de regras ou de varredura estava disponível, portanto as atribuições wcag: são próprias e justificadas em cada achado, e um achado fica com rule null por atribuição normativa incerta. Interações feitas: carregamento e snapshot da árvore de acessibilidade; leitura de DOM, atributos e estilos computados; Tab a partir do início do documento; Enter no botão de upload, que abriu o seletor de arquivos; envio do formulário vazio pelo botão Enviar, que produziu 8 mensagens de erro e moveu o foco para o alerta de resumo; Enter no controle Fechar a mensagem, que fecha corretamente, sem achado; abertura da lista do combobox Tipo de serviço, com aria-expanded passando a true no wrapper e no gatilho, sem achado; clique no link da página 2 da paginação, que troca o conteúdo da tabela; tentativas de abrir o calendário por foco e por clique no campo Data preferencial. Contraste calculado para os principais pares de texto e fundo (rótulos, textos de apoio, mensagens, botões, trilha, tabela e paginação): menor valor 4.60 na mensagem de erro de campo, todos acima de 4.5, sem achado. Limitação: depois do teste do upload o seletor de arquivos nativo ficou pendente e o servidor MCP passou a recusar browser_click, browser_type, browser_press_key, browser_evaluate, browser_resize e o conteúdo de browser_snapshot, sem ferramenta disponível para encerrar esse estado. As verificações seguintes foram feitas por URLs javascript: com leitura pelo título de uma janela auxiliar, ou seja, com eventos sintéticos no lugar de mouse e teclado reais e sem novo snapshot da árvore de acessibilidade. O comportamento do calendário e da paginação foi observado por script; as demais evidências vêm de leitura direta de DOM e de estilos computados, que independe do tipo de evento."
}
````

### Decisão

````json
{
  "cardId": "C-01051902e18abce7965c16f87517675f257d9f027e32fbe184eb707e398b2c40",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-064867287f2624db792f663b4c9fbe6ef15296aa9d9f6f140141e28fa3071fff

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botao tem aria-hidden="true" junto com tabindex="1": fica removido da arvore de acessibilidade mas permanece focalizavel e, por ser tabindex positivo, assume a frente da ordem de tabulacao. Um unico Tab a partir do carregamento da pagina leva o foco a ele (document.activeElement = button.upload-button), antes mesmo do skiplink 'Ir para o conteudo'.

Esperado: Um elemento com aria-hidden="true" nao pode ser focalizavel nem conter conteudo focalizavel: usar tabindex="-1" (o input real #documentos ja e o controle acessivel) ou remover o aria-hidden e dar-lhe nome acessivel. Tabindex positivo tambem nao deve ser usado.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html

Regra declarada: emag:2.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `scan_page S-page-001 finding F-010 (axe-core 'aria-hidden-focus', serious, locator .upload-button)` → identificador devolvido por ferramenta (sem arquivo)
- `scan_page S-page-002 finding F-022 (mesma regra)` → identificador devolvido por ferramenta (sem arquivo)
- `browser_press_key Tab a partir do carregamento; browser_evaluate: document.activeElement = {tag:'BUTTON', cls:'upload-button focus-visible', tabindex:'1', ariaHidden:'true', text:'Selecione o arquivo'}` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: outerHTML = '<button class="upload-button" type="button" aria-hidden="true" tabindex="1">...'` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "relatedSelectors": [
      "#documentos"
    ],
    "rule": "emag:2.2",
    "observed": "O botao tem aria-hidden=\"true\" junto com tabindex=\"1\": fica removido da arvore de acessibilidade mas permanece focalizavel e, por ser tabindex positivo, assume a frente da ordem de tabulacao. Um unico Tab a partir do carregamento da pagina leva o foco a ele (document.activeElement = button.upload-button), antes mesmo do skiplink 'Ir para o conteudo'.",
    "expected": "Um elemento com aria-hidden=\"true\" nao pode ser focalizavel nem conter conteudo focalizavel: usar tabindex=\"-1\" (o input real #documentos ja e o controle acessivel) ou remover o aria-hidden e dar-lhe nome acessivel. Tabindex positivo tambem nao deve ser usado.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html"
      ]
    },
    "evidence": [
      "scan_page S-page-001 finding F-010 (axe-core 'aria-hidden-focus', serious, locator .upload-button)",
      "scan_page S-page-002 finding F-022 (mesma regra)",
      "browser_press_key Tab a partir do carregamento; browser_evaluate: document.activeElement = {tag:'BUTTON', cls:'upload-button focus-visible', tabindex:'1', ariaHidden:'true', text:'Selecione o arquivo'}",
      "browser_evaluate: outerHTML = '<button class=\"upload-button\" type=\"button\" aria-hidden=\"true\" tabindex=\"1\">...'"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao (nome, CPF, dois br-select, grupo de radio, datetimepicker, textarea, upload, checkboxes, declaracao, acoes), mensagem de retorno de validacao, tabela de solicitacoes anteriores e paginacao"
  ],
  "notes": "Viewport 1280x900. Interacoes executadas: submissao do formulario vazio via .acao-enviar (mensagem br-message danger + feedbacks por campo + aria-invalid + foco movido para .content[role=alert][tabindex=-1]); fechamento da mensagem pelo controle .close com Enter via teclado (funcionou, mensagem removida); abertura/fechamento do br-select 'Tipo de servico' por clique no botao data-trigger e por ArrowDown com foco no input (aria-expanded alterna corretamente em ambos); foco/clique em #data-preferencial (NAO abre o calendario) e clique em #data-preferencial-btn (abre); inspecao da arvore do calendario aberto; Tab unico a partir do carregamento (foco caiu em .upload-button, nao no skiplink); clique em 'Pagina 2' da paginacao (as linhas da tabela mudam e data-current vai para 2, funcional). Varreduras do oraculo: S-page-001 (estado inicial) e S-page-002 (apos clique em .acao-enviar, comparada por compareToScanId). CANDIDATOS REJEITADOS, com motivo: (a) ds-structure-button-tag sobre o <a class='br-button circle'> do breadcrumb - o exemplo canonico breadcrumb-default usa exatamente <a class='br-button circle'>, entao a marcacao esta conforme; (b) ds-structure-button-tag sobre o <div class='br-button' role='button'> do fechar-mensagem - diverge do exemplo canonico message-padrao, que usa <button>, e seria um achado plausivel, mas verify_finding rejeitou o id (D-27: 'ds-structure-button-tag nao declara qual regra normativa implementa'), e o protocolo proibe emprestar o id de outra norma para sustentar exigencia estrutural; alem disso confirmei por teclado que o controle e operavel com Enter; (c) todos os ds-token-spacing e ds-token-radius (padding 29px em #servico/#unidade, margin -2px nas .br-list, border-radius 6px em #descricao, margin do select do flatpickr) - verify_finding rejeitou ds-token-spacing e ds-token-radius pelo mesmo D-27; permanecem como observacoes de revisao, nao como achados, ainda que 6px em #descricao destoe dos 4px dos demais controles; (d) o F-017 do scanner alega escala violada mas reporta 'margin: 0px', valor que esta na escala - evidencia autocontraditoria; (e) label-title-only em #forma-presencial - mesmo defeito ja reportado sob e-MAG 6.2, nao repetido sob outra regra; (f) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - identico aos exemplos canonicos do datetimepicker, e o campo aceita digitacao com instrucao de formato, entao ha alternativa de entrada; (g) <span tabindex='0' aria-current='page'> do breadcrumb - presente literalmente no exemplo canonico; (h) papel combobox no wrapper .br-input e opcoes como radio dentro de .br-list - padrao canonico do br-select, e verifiquei que e operavel por teclado; (i) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos de paginacao tambem nao usam aria-current, sem norma para sustentar; (j) erro de console 404 de /favicon.ico - irrelevante para conformidade. LIMITACOES: avaliei apenas o viewport 1280x900, sem checagem responsiva em larguras menores; nao testei leitor de tela real, apenas a arvore de acessibilidade e atributos ARIA; nao exercitei o upload de arquivo real nem uma submissao valida completa ate o estado de sucesso, entao o estado de sucesso do formulario nao foi avaliado; os ids das .br-list sao gerados aleatoriamente a cada carga, por isso nenhum seletor deste relatorio depende deles; os achados 4, 5 e 6 estao na marcacao do flatpickr embutido no componente datetimepicker, e nao no codigo proprio da tela, mas integram a interface entregue."
}
````

### Decisão

````json
{
  "cardId": "C-064867287f2624db792f663b4c9fbe6ef15296aa9d9f6f140141e28fa3071fff",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0bb2ebf131e21711248360e5c6b32a2d8df208eef0b6313eef83929cab2bd586

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Ao enviar o formulário com campos vazios, #unidade recebe aria-invalid="true", mas seu aria-describedby é null e o span de erro correspondente ('Selecione a unidade de atendimento.') é inserido sem atributo id, de modo que nenhuma referência pode alcançá-lo. Todos os demais campos inválidos associam a mensagem: #nome→nome-retorno, #cpf→'cpf-apoio cpf-retorno', os três rádios de forma→forma-retorno, #data-preferencial→'data-apoio data-retorno', #descricao→'descricao-apoio descricao-retorno' e #declaracao→declaracao-retorno.

Esperado: A mensagem de erro do campo deve ser programaticamente associada a ele, recebendo um id (por exemplo unidade-retorno) referenciado pelo aria-describedby de #unidade, como nos demais campos, para que o erro seja identificado ao navegar até o campo.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. abrir o combobox 'Tipo de serviço' e selecionar 'Emissão de certidão' 3. acionar o botão 'Enviar' com os demais campos vazios 4. listar elementos com aria-invalid e seus aria-describedby 5. listar todos os .feedback e seus ids

Regra declarada: wcag:3.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate: invalidMarked inclui {id:'unidade', v:'true', desc:null}` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: unidadeInputDescribedby=null e unidadeFeedback=[{id:null, role:'alert', txt:'Selecione a unidade de atendimento.'}]` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: allFeedbackIds mostra id null apenas para a mensagem de unidade` → identificador devolvido por ferramenta (sem arquivo)
- `.playwright-mcp/page-2026-09-19T02-47-03-424Z.yml` → `pipeline/logs/2026-09-18T23-14-46-sem-run2-a967f5af-evidencia/.playwright-mcp/page-2026-09-19T02-47-03-424Z.yml` (sha256 b3f5cf7ad5c7)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#unidade",
    "relatedSelectors": [
      ".campo-unidade .feedback.danger"
    ],
    "rule": "wcag:3.3.1",
    "observed": "Ao enviar o formulário com campos vazios, #unidade recebe aria-invalid=\"true\", mas seu aria-describedby é null e o span de erro correspondente ('Selecione a unidade de atendimento.') é inserido sem atributo id, de modo que nenhuma referência pode alcançá-lo. Todos os demais campos inválidos associam a mensagem: #nome→nome-retorno, #cpf→'cpf-apoio cpf-retorno', os três rádios de forma→forma-retorno, #data-preferencial→'data-apoio data-retorno', #descricao→'descricao-apoio descricao-retorno' e #declaracao→declaracao-retorno.",
    "expected": "A mensagem de erro do campo deve ser programaticamente associada a ele, recebendo um id (por exemplo unidade-retorno) referenciado pelo aria-describedby de #unidade, como nos demais campos, para que o erro seja identificado ao navegar até o campo.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "abrir o combobox 'Tipo de serviço' e selecionar 'Emissão de certidão'",
        "acionar o botão 'Enviar' com os demais campos vazios",
        "listar elementos com aria-invalid e seus aria-describedby",
        "listar todos os .feedback e seus ids"
      ]
    },
    "evidence": [
      "browser_evaluate: invalidMarked inclui {id:'unidade', v:'true', desc:null}",
      "browser_evaluate: unidadeInputDescribedby=null e unidadeFeedback=[{id:null, role:'alert', txt:'Selecione a unidade de atendimento.'}]",
      "browser_evaluate: allFeedbackIds mostra id null apenas para a mensagem de unidade",
      ".playwright-mcp/page-2026-09-19T02-47-03-424Z.yml"
    ]
  },
  "scope": [
    "solicitacao.html — tela inteira: skiplink, cabeçalho gov.br, breadcrumb, formulário de solicitação (nome, CPF, tipo de serviço, unidade, forma de atendimento, data preferencial, descrição, documentos, recursos de acessibilidade, declaração, ações) e seção 'Solicitações anteriores' com tabela e paginação",
    "estados observados: carga inicial; combobox aberto; formulário submetido vazio (erros); formulário submetido válido (sucesso); paginação na página 2; viewport 320x800"
  ],
  "notes": "Ferramentas usadas: navegação, snapshot da árvore de acessibilidade, avaliação de DOM/CSS computado, teclado e mouse. Interações executadas: Tab a partir do início do documento para verificar ordem de foco; abertura e fechamento dos dois comboboxes por clique e por teclado (ArrowDown/Enter); seleção de opções; clique no rótulo 'Presencial' e no input correspondente; navegação por ArrowUp dentro do grupo de rádio; preenchimento de nome, CPF, data e descrição; submissão com campos vazios e verificação das mensagens de erro, de aria-invalid, de aria-describedby e do destino do foco; fechamento da mensagem de erro por Enter no controle 'Fechar a mensagem' (funcionou); submissão válida completa e verificação da mensagem de sucesso (role=alert, foco movido, aria-invalid limpo); clique em 'Página 2' da paginação; redimensionamento para 320x800 e medição de transbordo. Contraste verificado por cálculo de razão em 23 combinações de texto e fundo (rótulos, textos de apoio, mensagens, botões, breadcrumb, paginação, tabela, skiplink): todas passaram em AA, nenhum achado de contraste. Indicadores de foco verificados em 16 controles. Limitações: nenhum oráculo de regras nem ferramenta scan_page/verificação heurística estava disponível nesta execução, portanto não há identificadores de regra devolvidos por ferramenta; as atribuições usam critérios WCAG que consigo justificar pela observação, e os candidatos que não consegui atribuir com segurança foram deixados fora dos achados e estão declarados aqui como incertos. Incertos (observados, não reportados como achado por atribuição normativa insegura ou por serem possivelmente o comportamento padrão do Design System gov.br, não um defeito da tela): (1) o skiplink usa nav[role=menubar] com a[role=menuitem] para um único link de atalho, o que faz leitores de tela anunciarem barra de menus em vez de link; (2) role=combobox está no wrapper div.br-input, que não é focalizável, enquanto o elemento que recebe foco (#servico/#unidade) é exposto como textbox simples, sem aria-expanded — o estado de expansão existe mas fica no wrapper; as opções em role=option não têm aria-selected; (3) o span do item atual do breadcrumb tem tabindex=0, criando uma parada de foco sem ação; (4) a troca de página da tabela não é anunciada (o conteúdo muda sem região viva e o foco permanece no link). O erro 404 de /favicon.ico no console é irrelevante para conformidade. Um único achado usa seletor com dois elementos (#servico, #unidade) porque a mesma regra CSS produz a mesma afirmação para ambos."
}
````

### Decisão

````json
{
  "cardId": "C-0bb2ebf131e21711248360e5c6b32a2d8df208eef0b6313eef83929cab2bd586",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-0dec41c2fb64de210343732dd574e6093d2e8a5d35f45eb1e8fc6a13067ca7f6

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:375x812

Observado: Com a janela em 375x812 a tabela ocupa 533px dentro do contêiner .br-table de 328px, que computa overflow: visible; documentElement.scrollWidth=549 contra clientWidth=360, ou seja, a página inteira passa a rolar horizontalmente e as colunas Data e Situação ficam fora da viewport.

Esperado: Sem rolagem horizontal da página em viewport estreita (320 CSS px): a tabela deve caber na largura disponível ou rolar dentro do próprio contêiner (overflow-x: auto em .br-table).

Janela: 375×812 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. redimensionar a janela para 375x812

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 375x812; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div:nth-of-type(1)>div>main>section>div>table" — <table> "Protocolo Serviço Data Situação 2026.0918.004417"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `govbr-ds-validator get_ds_rules id=govbr-3.7.0-accessibility-global-1c3bd2a1c1a7 ("Componente utilizável em dispositivos móveis", force=required, validationStrategy=responsive-viewport)` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate em 375x812: documentElement.scrollWidth=549, clientWidth=360, .br-table width=328, table scrollWidth=533, .br-table overflowX=visible` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".tabela-anteriores table",
    "relatedSelectors": [
      ".tabela-anteriores"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Com a janela em 375x812 a tabela ocupa 533px dentro do contêiner .br-table de 328px, que computa overflow: visible; documentElement.scrollWidth=549 contra clientWidth=360, ou seja, a página inteira passa a rolar horizontalmente e as colunas Data e Situação ficam fora da viewport.",
    "expected": "Sem rolagem horizontal da página em viewport estreita (320 CSS px): a tabela deve caber na largura disponível ou rolar dentro do próprio contêiner (overflow-x: auto em .br-table).",
    "state": {
      "viewport": {
        "width": 375,
        "height": 812
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "redimensionar a janela para 375x812"
      ]
    },
    "evidence": [
      "govbr-ds-validator get_ds_rules id=govbr-3.7.0-accessibility-global-1c3bd2a1c1a7 (\"Componente utilizável em dispositivos móveis\", force=required, validationStrategy=responsive-viewport)",
      "browser_evaluate em 375x812: documentElement.scrollWidth=549, clientWidth=360, .br-table width=328, table scrollWidth=533, .br-table overflowX=visible"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-0dec41c2fb64de210343732dd574e6093d2e8a5d35f45eb1e8fc6a13067ca7f6",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-17b6bebf4dcdbc9df20b0251d7f4c4069525a4d8077fe3f7de91f6a73ef3919c

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botão visível de upload tem tabindex="1", o único tabindex positivo da página. Com o foco no início do documento, o primeiro Tab levou o foco diretamente para este botão (document.activeElement = BUTTON.upload-button, tabindex=1), antes do skiplink 'Ir para o conteúdo', do cabeçalho, do breadcrumb e de todos os campos que o precedem visualmente.

Esperado: A ordem de tabulação deve seguir a ordem visual e de leitura: o botão de upload deve ser alcançado na sua posição do formulário, após a descrição da solicitação, usando tabindex="0" ou nenhum tabindex, sem valores positivos.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. blur do elemento ativo para iniciar do começo do documento 3. pressionar Tab uma vez 4. ler document.activeElement

Regra declarada: wcag:2.4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate: positiveTabindex=[{tag:BUTTON, cls:upload-button, ti:1}]` → identificador devolvido por ferramenta (sem arquivo)
- `browser_press_key Tab seguido de browser_evaluate: activeElement=BUTTON.upload-button tabindex=1` → identificador devolvido por ferramenta (sem arquivo)
- `.playwright-mcp/page-2026-09-19T02-44-23-945Z.yml` → `pipeline/logs/2026-09-18T23-14-46-sem-run2-a967f5af-evidencia/.playwright-mcp/page-2026-09-19T02-44-23-945Z.yml` (sha256 3a9e7daaede6)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "rule": "wcag:2.4.3",
    "observed": "O botão visível de upload tem tabindex=\"1\", o único tabindex positivo da página. Com o foco no início do documento, o primeiro Tab levou o foco diretamente para este botão (document.activeElement = BUTTON.upload-button, tabindex=1), antes do skiplink 'Ir para o conteúdo', do cabeçalho, do breadcrumb e de todos os campos que o precedem visualmente.",
    "expected": "A ordem de tabulação deve seguir a ordem visual e de leitura: o botão de upload deve ser alcançado na sua posição do formulário, após a descrição da solicitação, usando tabindex=\"0\" ou nenhum tabindex, sem valores positivos.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "blur do elemento ativo para iniciar do começo do documento",
        "pressionar Tab uma vez",
        "ler document.activeElement"
      ]
    },
    "evidence": [
      "browser_evaluate: positiveTabindex=[{tag:BUTTON, cls:upload-button, ti:1}]",
      "browser_press_key Tab seguido de browser_evaluate: activeElement=BUTTON.upload-button tabindex=1",
      ".playwright-mcp/page-2026-09-19T02-44-23-945Z.yml"
    ]
  },
  "scope": [
    "solicitacao.html — tela inteira: skiplink, cabeçalho gov.br, breadcrumb, formulário de solicitação (nome, CPF, tipo de serviço, unidade, forma de atendimento, data preferencial, descrição, documentos, recursos de acessibilidade, declaração, ações) e seção 'Solicitações anteriores' com tabela e paginação",
    "estados observados: carga inicial; combobox aberto; formulário submetido vazio (erros); formulário submetido válido (sucesso); paginação na página 2; viewport 320x800"
  ],
  "notes": "Ferramentas usadas: navegação, snapshot da árvore de acessibilidade, avaliação de DOM/CSS computado, teclado e mouse. Interações executadas: Tab a partir do início do documento para verificar ordem de foco; abertura e fechamento dos dois comboboxes por clique e por teclado (ArrowDown/Enter); seleção de opções; clique no rótulo 'Presencial' e no input correspondente; navegação por ArrowUp dentro do grupo de rádio; preenchimento de nome, CPF, data e descrição; submissão com campos vazios e verificação das mensagens de erro, de aria-invalid, de aria-describedby e do destino do foco; fechamento da mensagem de erro por Enter no controle 'Fechar a mensagem' (funcionou); submissão válida completa e verificação da mensagem de sucesso (role=alert, foco movido, aria-invalid limpo); clique em 'Página 2' da paginação; redimensionamento para 320x800 e medição de transbordo. Contraste verificado por cálculo de razão em 23 combinações de texto e fundo (rótulos, textos de apoio, mensagens, botões, breadcrumb, paginação, tabela, skiplink): todas passaram em AA, nenhum achado de contraste. Indicadores de foco verificados em 16 controles. Limitações: nenhum oráculo de regras nem ferramenta scan_page/verificação heurística estava disponível nesta execução, portanto não há identificadores de regra devolvidos por ferramenta; as atribuições usam critérios WCAG que consigo justificar pela observação, e os candidatos que não consegui atribuir com segurança foram deixados fora dos achados e estão declarados aqui como incertos. Incertos (observados, não reportados como achado por atribuição normativa insegura ou por serem possivelmente o comportamento padrão do Design System gov.br, não um defeito da tela): (1) o skiplink usa nav[role=menubar] com a[role=menuitem] para um único link de atalho, o que faz leitores de tela anunciarem barra de menus em vez de link; (2) role=combobox está no wrapper div.br-input, que não é focalizável, enquanto o elemento que recebe foco (#servico/#unidade) é exposto como textbox simples, sem aria-expanded — o estado de expansão existe mas fica no wrapper; as opções em role=option não têm aria-selected; (3) o span do item atual do breadcrumb tem tabindex=0, criando uma parada de foco sem ação; (4) a troca de página da tabela não é anunciada (o conteúdo muda sem região viva e o foco permanece no link). O erro 404 de /favicon.ico no console é irrelevante para conformidade. Um único achado usa seletor com dois elementos (#servico, #unidade) porque a mesma regra CSS produz a mesma afirmação para ambos."
}
````

### Decisão

````json
{
  "cardId": "C-17b6bebf4dcdbc9df20b0251d7f4c4069525a4d8077fe3f7de91f6a73ef3919c",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-18d5745883f85dabb1124e4c2d75187a409838338bd801c204a91f66e320ce3b

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Após enviar o formulário vazio, o campo Tipo de serviço recebe aria-invalid=true e a mensagem Selecione o tipo de serviço é inserida ao lado dele, mas o span da mensagem não tem id e o input não tem aria-describedby. Os demais campos do mesmo formulário associam a mensagem, como #nome com aria-describedby=nome-retorno. Ao voltar ao campo, a tecnologia assistiva anuncia apenas o estado inválido, sem o texto do erro.

Esperado: A mensagem de erro deve estar programaticamente associada ao campo, por exemplo com id no span e aria-describedby no input, como nos demais campos.

Janela: 1280×900 · interações desde o carregamento: 1. carregar a página 2. acionar o botão Enviar com o formulário vazio

Regra declarada: wcag:3.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(1)>div>div:nth-of-type(1)>div>input" — <input#servico> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-a10dcb076ad236543b32667bd7e0adfec72fef26085a4924a9eb55ecf74492e3 — A-08 · apos-envio-vazio · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4c4e6005ce86b914ed8b58011b3f8effcee1326c119327ddd4eb9e9e0540a41 — A-04 · sempre · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `janela auxiliar p2: S:true,null,FBID:EMPTY e N:nome-retorno` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate sobre .campo-servico: span class feedback danger retorno-campo com role alert e sem id` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#servico",
    "relatedSelectors": [
      ".campo-servico .feedback"
    ],
    "rule": "wcag:3.3.1",
    "observed": "Após enviar o formulário vazio, o campo Tipo de serviço recebe aria-invalid=true e a mensagem Selecione o tipo de serviço é inserida ao lado dele, mas o span da mensagem não tem id e o input não tem aria-describedby. Os demais campos do mesmo formulário associam a mensagem, como #nome com aria-describedby=nome-retorno. Ao voltar ao campo, a tecnologia assistiva anuncia apenas o estado inválido, sem o texto do erro.",
    "expected": "A mensagem de erro deve estar programaticamente associada ao campo, por exemplo com id no span e aria-describedby no input, como nos demais campos.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar a página",
        "acionar o botão Enviar com o formulário vazio"
      ]
    },
    "evidence": [
      "janela auxiliar p2: S:true,null,FBID:EMPTY e N:nome-retorno",
      "browser_evaluate sobre .campo-servico: span class feedback danger retorno-campo com role alert e sem id"
    ]
  },
  "scope": [
    "tela inteira: barra superior, trilha de navegação, formulário Solicitar serviço e região Solicitações anteriores"
  ],
  "notes": "Execução sem oráculo de regras: nenhuma ferramenta de consulta de regras ou de varredura estava disponível, portanto as atribuições wcag: são próprias e justificadas em cada achado, e um achado fica com rule null por atribuição normativa incerta. Interações feitas: carregamento e snapshot da árvore de acessibilidade; leitura de DOM, atributos e estilos computados; Tab a partir do início do documento; Enter no botão de upload, que abriu o seletor de arquivos; envio do formulário vazio pelo botão Enviar, que produziu 8 mensagens de erro e moveu o foco para o alerta de resumo; Enter no controle Fechar a mensagem, que fecha corretamente, sem achado; abertura da lista do combobox Tipo de serviço, com aria-expanded passando a true no wrapper e no gatilho, sem achado; clique no link da página 2 da paginação, que troca o conteúdo da tabela; tentativas de abrir o calendário por foco e por clique no campo Data preferencial. Contraste calculado para os principais pares de texto e fundo (rótulos, textos de apoio, mensagens, botões, trilha, tabela e paginação): menor valor 4.60 na mensagem de erro de campo, todos acima de 4.5, sem achado. Limitação: depois do teste do upload o seletor de arquivos nativo ficou pendente e o servidor MCP passou a recusar browser_click, browser_type, browser_press_key, browser_evaluate, browser_resize e o conteúdo de browser_snapshot, sem ferramenta disponível para encerrar esse estado. As verificações seguintes foram feitas por URLs javascript: com leitura pelo título de uma janela auxiliar, ou seja, com eventos sintéticos no lugar de mouse e teclado reais e sem novo snapshot da árvore de acessibilidade. O comportamento do calendário e da paginação foi observado por script; as demais evidências vêm de leitura direta de DOM e de estilos computados, que independe do tipo de evento."
}
````

### Decisão

````json
{
  "cardId": "C-18d5745883f85dabb1124e4c2d75187a409838338bd801c204a91f66e320ce3b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1a6a4648dcbf0eb226158cb4bd96190741254c1917c8d6d7b105ce7c3fcb8a48

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botao visivel 'Selecione o arquivo' (550x40 px, display:block) tem aria-hidden="true" e mesmo assim permanece focalizavel (tabindex="1"). O input[type=file] #documentos associado esta com display:none pela regra .br-upload input, portanto esse botao e o unico controle operavel do upload e nao e exposto a tecnologia assistiva.

Esperado: Controle visivel e operavel deve permanecer exposto na arvore de acessibilidade: remover aria-hidden="true" do botao (ou entao torna-lo nao focalizavel e deixar o input acessivel).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. pressionar Tab a partir do documento recem-carregado

Regra declarada: emag-2.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `scan S-page-001 finding F-010 (axe 'aria-hidden-focus', serious)` → identificador devolvido por ferramenta (sem arquivo)
- `scan S-page-002 finding F-022` → identificador devolvido por ferramenta (sem arquivo)
- `DOM/CSS computado: aria-hidden=true, tabindex=1, display=block, 550x40; #documentos display=none` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "relatedSelectors": [
      "#documentos"
    ],
    "rule": "emag-2.2",
    "observed": "O botao visivel 'Selecione o arquivo' (550x40 px, display:block) tem aria-hidden=\"true\" e mesmo assim permanece focalizavel (tabindex=\"1\"). O input[type=file] #documentos associado esta com display:none pela regra .br-upload input, portanto esse botao e o unico controle operavel do upload e nao e exposto a tecnologia assistiva.",
    "expected": "Controle visivel e operavel deve permanecer exposto na arvore de acessibilidade: remover aria-hidden=\"true\" do botao (ou entao torna-lo nao focalizavel e deixar o input acessivel).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "pressionar Tab a partir do documento recem-carregado"
      ]
    },
    "evidence": [
      "scan S-page-001 finding F-010 (axe 'aria-hidden-focus', serious)",
      "scan S-page-002 finding F-022",
      "DOM/CSS computado: aria-hidden=true, tabindex=1, display=block, 550x40; #documentos display=none"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao, secao Solicitacoes anteriores (tabela + paginacao)",
    "estados: carga inicial, erro de validacao apos Enviar vazio, envio bem-sucedido, lista do br-select aberta, calendario do br-datetimepicker aberto"
  ],
  "notes": "Interacoes realizadas: carga inicial em 1280x900; snapshot da arvore de acessibilidade; tabulacao a partir de pagina recem-carregada (primeiro Tab); clique em Enviar com formulario vazio; foco e acionamento do botao de fechar da mensagem de erro com Enter e com Space (ambos funcionam e removem a mensagem); abertura da lista de #servico e de #unidade por ArrowDown e selecao por Enter (aria-expanded alterna corretamente e o foco vai para o primeiro br-item); Enter dentro de #servico dispara submissao implicita do formulario (comportamento nativo, nao tratado como defeito); preenchimento completo e envio bem-sucedido (mensagem br-message success, aria-invalid limpos, foco movido para .content[role=alert]); abertura do calendario pelo botao #data-preferencial-btn e inspecao dos controles de mes; leitura de CSS computado e de regras de origem para distinguir folha do @govbr-ds/core da folha da aplicacao. Varreduras do oraculo: S-page-001 (estado inicial, fingerprint sha256:fec51e82...) e S-page-002 (estado de erro, fingerprint sha256:d5b6611b...). Candidatos rejeitados e por que: (a) as 6 deteccoes ds-token-spacing/ds-token-radius (#descricao 6px, #servico e #unidade padding 29px, .br-list margin -2px, select do flatpickr) foram rejeitadas - verify_finding V-001 devolveu verdict=rejected, applicability=fail, 'verificacao deterministica sem norma nomeada nao produz achado' (D-27), e a inspecao de origem mostrou que todos esses valores vem da folha do proprio @govbr-ds/core (jsx-runtime-B-RTDNcS.css), nao da aplicacao; (b) ds-structure-button-tag no <a class='br-button circle'> do breadcrumb e no <div class='br-button' role='button'> do fechar da mensagem de erro - rejeitado por V-003 pelo mesmo motivo de ausencia de norma nomeada, e no caso do breadcrumb o exemplo canonico breadcrumb-default do proprio DS usa exatamente <a class='br-button circle'>; o div com role=button tem nome acessivel e responde a Enter e a Space, entao nao restou violacao normativa a citar; (c) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - coincide com os exemplos canonicos datetimepicker-simple/range/time do DS, rejeitado; (d) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos pagination-default/sizes/ellipsis tambem usam apenas a classe active e o oraculo nao expoe regra para isso: classificado como incerto e nao reportado; (e) ausencia de <ul>/<li> envolvendo os itens da paginacao e classes fora do vocabulario canonico (trilha-servico, acao-enviar, tabela-anteriores etc.) - o proprio oraculo as trata como observacao sem norma; (f) #servico mantem aria-invalid='true' e a mensagem de erro depois de a opcao ser escolhida (a limpeza so ocorre em nova submissao) - nao encontrei norma que exija revalidacao imediata, fica como incerto; (g) apos fechar a mensagem de erro o foco volta para <body> - incerto, nao reportado. Limitacoes: axe-core 4.12.1 rodou com 0 resultados incomplete e nenhuma violacao de contraste; emag-6.2, emag-6.3 e emag-2.2 nao tem predicado mecanico no oraculo (verify_finding V-002 e V-004 devolveram 'no-predicate' com ruleExists=pass, applicability=pass e evidenceConsistent=pass), de modo que esses achados se apoiam em inspecao direta do DOM, do CSS computado e da operacao por teclado, e nao em confirmacao mecanica; nao foi possivel exercitar o envio real de arquivo no input de upload; nao foram avaliados outros viewports alem de 1280x900."
}
````

### Decisão

````json
{
  "cardId": "C-1a6a4648dcbf0eb226158cb4bd96190741254c1917c8d6d7b105ce7c3fcb8a48",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1cd7532a6b72ab9090396cb40720690879aadbef8d80a9495f01aa5ff0834fe3

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botão Selecione o arquivo usa tabindex=1, valor positivo. Partindo do início do documento, o primeiro Tab leva o foco para esse botão, antes do link Ir para o conteúdo, do cabeçalho, da trilha de navegação e de todos os campos do formulário que o precedem visualmente.

Esperado: A ordem de tabulação deve seguir a ordem de leitura e significado da página; o botão não deve usar tabindex positivo, mas tabindex 0 ou nenhum tabindex.

Janela: 1280×900 · interações desde o carregamento: 1. carregar a página 2. pressionar Tab uma vez

Regra declarada: wcag:2.4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_press_key Tab e leitura de document.activeElement: BUTTON class upload-button focus-visible, tabindex 1, aria-hidden true, texto Selecione o arquivo` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: único elemento com tabindex positivo na página` → identificador devolvido por ferramenta (sem arquivo)
- `janela auxiliar p2: UP:11true` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "rule": "wcag:2.4.3",
    "observed": "O botão Selecione o arquivo usa tabindex=1, valor positivo. Partindo do início do documento, o primeiro Tab leva o foco para esse botão, antes do link Ir para o conteúdo, do cabeçalho, da trilha de navegação e de todos os campos do formulário que o precedem visualmente.",
    "expected": "A ordem de tabulação deve seguir a ordem de leitura e significado da página; o botão não deve usar tabindex positivo, mas tabindex 0 ou nenhum tabindex.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar a página",
        "pressionar Tab uma vez"
      ]
    },
    "evidence": [
      "browser_press_key Tab e leitura de document.activeElement: BUTTON class upload-button focus-visible, tabindex 1, aria-hidden true, texto Selecione o arquivo",
      "browser_evaluate: único elemento com tabindex positivo na página",
      "janela auxiliar p2: UP:11true"
    ]
  },
  "scope": [
    "tela inteira: barra superior, trilha de navegação, formulário Solicitar serviço e região Solicitações anteriores"
  ],
  "notes": "Execução sem oráculo de regras: nenhuma ferramenta de consulta de regras ou de varredura estava disponível, portanto as atribuições wcag: são próprias e justificadas em cada achado, e um achado fica com rule null por atribuição normativa incerta. Interações feitas: carregamento e snapshot da árvore de acessibilidade; leitura de DOM, atributos e estilos computados; Tab a partir do início do documento; Enter no botão de upload, que abriu o seletor de arquivos; envio do formulário vazio pelo botão Enviar, que produziu 8 mensagens de erro e moveu o foco para o alerta de resumo; Enter no controle Fechar a mensagem, que fecha corretamente, sem achado; abertura da lista do combobox Tipo de serviço, com aria-expanded passando a true no wrapper e no gatilho, sem achado; clique no link da página 2 da paginação, que troca o conteúdo da tabela; tentativas de abrir o calendário por foco e por clique no campo Data preferencial. Contraste calculado para os principais pares de texto e fundo (rótulos, textos de apoio, mensagens, botões, trilha, tabela e paginação): menor valor 4.60 na mensagem de erro de campo, todos acima de 4.5, sem achado. Limitação: depois do teste do upload o seletor de arquivos nativo ficou pendente e o servidor MCP passou a recusar browser_click, browser_type, browser_press_key, browser_evaluate, browser_resize e o conteúdo de browser_snapshot, sem ferramenta disponível para encerrar esse estado. As verificações seguintes foram feitas por URLs javascript: com leitura pelo título de uma janela auxiliar, ou seja, com eventos sintéticos no lugar de mouse e teclado reais e sem novo snapshot da árvore de acessibilidade. O comportamento do calendário e da paginação foi observado por script; as demais evidências vêm de leitura direta de DOM e de estilos computados, que independe do tipo de evento."
}
````

### Decisão

````json
{
  "cardId": "C-1cd7532a6b72ab9090396cb40720690879aadbef8d80a9495f01aa5ff0834fe3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1df5d484362d63751a7ea7058f7ad7c39fe68f15c206753d4db400b471c2b6fe

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O item atual da trilha de navegação, Solicitar serviço, é um span de texto estático com tabindex=0 e aria-current=page. Ele entra na sequência de tabulação e recebe foco, embora não tenha papel interativo nem ação associada, criando uma parada de foco em conteúdo não operável. Os demais itens da trilha são links.

Esperado: O item atual da trilha não deve ser focável: manter aria-current=page e remover tabindex=0 do span.

Janela: 1280×900 · interações desde o carregamento: 1. carregar a página

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta

### Sujeitos

- "body>div:nth-of-type(1)>div>nav:nth-of-type(2)>ol>li:nth-of-type(3)>span" — <span> "Solicitar serviço"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: span tabindex=0 aria-current=page dentro de li.crumb com data-active` → identificador devolvido por ferramenta (sem arquivo)
- `.playwright-mcp/page-2026-09-19T02-25-53-574Z.yml: terceiro item da navegação Breadcrumbs exposto como generic, não como link` → não encontrado na evidência preservada da execução
- `janela auxiliar p2: SPN:10, ou seja, 1 elemento com tabindex 0` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "span[aria-current=page]",
    "rule": null,
    "observed": "O item atual da trilha de navegação, Solicitar serviço, é um span de texto estático com tabindex=0 e aria-current=page. Ele entra na sequência de tabulação e recebe foco, embora não tenha papel interativo nem ação associada, criando uma parada de foco em conteúdo não operável. Os demais itens da trilha são links.",
    "expected": "O item atual da trilha não deve ser focável: manter aria-current=page e remover tabindex=0 do span.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar a página"
      ]
    },
    "evidence": [
      "browser_evaluate: span tabindex=0 aria-current=page dentro de li.crumb com data-active",
      ".playwright-mcp/page-2026-09-19T02-25-53-574Z.yml: terceiro item da navegação Breadcrumbs exposto como generic, não como link",
      "janela auxiliar p2: SPN:10, ou seja, 1 elemento com tabindex 0"
    ]
  },
  "scope": [
    "tela inteira: barra superior, trilha de navegação, formulário Solicitar serviço e região Solicitações anteriores"
  ],
  "notes": "Execução sem oráculo de regras: nenhuma ferramenta de consulta de regras ou de varredura estava disponível, portanto as atribuições wcag: são próprias e justificadas em cada achado, e um achado fica com rule null por atribuição normativa incerta. Interações feitas: carregamento e snapshot da árvore de acessibilidade; leitura de DOM, atributos e estilos computados; Tab a partir do início do documento; Enter no botão de upload, que abriu o seletor de arquivos; envio do formulário vazio pelo botão Enviar, que produziu 8 mensagens de erro e moveu o foco para o alerta de resumo; Enter no controle Fechar a mensagem, que fecha corretamente, sem achado; abertura da lista do combobox Tipo de serviço, com aria-expanded passando a true no wrapper e no gatilho, sem achado; clique no link da página 2 da paginação, que troca o conteúdo da tabela; tentativas de abrir o calendário por foco e por clique no campo Data preferencial. Contraste calculado para os principais pares de texto e fundo (rótulos, textos de apoio, mensagens, botões, trilha, tabela e paginação): menor valor 4.60 na mensagem de erro de campo, todos acima de 4.5, sem achado. Limitação: depois do teste do upload o seletor de arquivos nativo ficou pendente e o servidor MCP passou a recusar browser_click, browser_type, browser_press_key, browser_evaluate, browser_resize e o conteúdo de browser_snapshot, sem ferramenta disponível para encerrar esse estado. As verificações seguintes foram feitas por URLs javascript: com leitura pelo título de uma janela auxiliar, ou seja, com eventos sintéticos no lugar de mouse e teclado reais e sem novo snapshot da árvore de acessibilidade. O comportamento do calendário e da paginação foi observado por script; as demais evidências vêm de leitura direta de DOM e de estilos computados, que independe do tipo de evento."
}
````

### Decisão

````json
{
  "cardId": "C-1df5d484362d63751a7ea7058f7ad7c39fe68f15c206753d4db400b471c2b6fe",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1ea809eaefbbc077023114e613488ae01b73ad4af658e0f8dd52266343bd2a0a

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: Form elements must have labels

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: axe:label

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>fieldset:nth-of-type(1)>div:nth-of-type(1)>input" — <input#forma-presencial>

### Unidades candidatas (não são crédito)

- U-471fd34bfed8d491133fe60cfe6233aa00117fefb796768495ff7598fa7a6a5e — A-09 · sempre · cena 1280x900 · <input#forma-presencial>: Estrato S · variante label-sem-for, na primeira opção do grupo (convenção registrada em tela-a/construcao.md). O <label> de "Presencial" não tem for: o radio fica sem nome acessível e clicar no texto não o marca. As outras duas opções estão associadas.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: for, aria-label, aria-labelledby. Medido: ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#forma-presencial",
    "rule": "axe:label",
    "observed": "Form elements must have labels",
    "expected": null,
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-1ea809eaefbbc077023114e613488ae01b73ad4af658e0f8dd52266343bd2a0a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1eb87212f702e1064075fe9e3f7a712df9c6d3f187a335853a35a0ff150d9d3e

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O único controle de upload visível e operável é <button class="upload-button" aria-hidden="true" tabindex="1">Selecione o arquivo</button>, removido da árvore de acessibilidade por aria-hidden="true"; o input real #documentos está com display:none (getBoundingClientRect 0x0), portanto também não é exposto nem focável. Nenhum controle de envio de arquivo aparece na árvore de acessibilidade do campo "Documentos comprobatórios (opcional)".

Esperado: O controle de upload deve estar exposto à tecnologia assistiva com papel e nome acessível — por exemplo mantendo #documentos focável (oculto visualmente, não display:none) ou removendo aria-hidden do botão que o aciona.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T03-13-32-616Z.yml (snapshot mostra apenas "button [ref=e80]" com texto, sem nenhum controle de arquivo)` → não encontrado na evidência preservada da execução
- `browser_evaluate: fileInput {display:"none", rect 0x0}; uploadBtn {ariaHidden:"true", tabindex:"1", display:"block", 550x40}` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "relatedSelectors": [
      "#documentos"
    ],
    "rule": "wcag:4.1.2",
    "observed": "O único controle de upload visível e operável é <button class=\"upload-button\" aria-hidden=\"true\" tabindex=\"1\">Selecione o arquivo</button>, removido da árvore de acessibilidade por aria-hidden=\"true\"; o input real #documentos está com display:none (getBoundingClientRect 0x0), portanto também não é exposto nem focável. Nenhum controle de envio de arquivo aparece na árvore de acessibilidade do campo \"Documentos comprobatórios (opcional)\".",
    "expected": "O controle de upload deve estar exposto à tecnologia assistiva com papel e nome acessível — por exemplo mantendo #documentos focável (oculto visualmente, não display:none) ou removendo aria-hidden do botão que o aciona.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T03-13-32-616Z.yml (snapshot mostra apenas \"button [ref=e80]\" com texto, sem nenhum controle de arquivo)",
      "browser_evaluate: fileInput {display:\"none\", rect 0x0}; uploadBtn {ariaHidden:\"true\", tabindex:\"1\", display:\"block\", 550x40}"
    ]
  },
  "scope": [
    "tela inteira /solicitacao.html: skiplink, cabeçalho, breadcrumb, formulário de solicitação (nome, CPF, dois selects br-select, grupo de rádios, datetimepicker, textarea, upload, grupo de checkboxes, declaração, ações), mensagens de retorno de envio, tabela \"Solicitações anteriores\" e paginação"
  ],
  "notes": "Sem oráculo de regras nesta execução: nenhuma ferramenta de consulta de regras, scan_page ou verificação heurística estava disponível; as atribuições usam wcag:<critério> apenas quando justificáveis e rule:null quando não. Interações realizadas: carga inicial e árvore de acessibilidade; Tab a partir do topo (13 paradas registradas por listener de focusin); abertura dos dois selects por mouse e por teclado (ArrowDown/Enter) com verificação de aria-expanded e valor; clique no rótulo \"Presencial\" e seleção do mesmo rádio por Espaço; envio do formulário vazio (mensagem \"Há 8 campo(s) obrigatório(s) sem preenchimento\", foco movido para o role=alert) e inspeção de aria-invalid/aria-describedby de todos os campos; fechamento da mensagem de erro pelo teclado (Enter no div role=button, funcionou); preenchimento completo e envio bem-sucedido; clique em \"Página 2\" da paginação; varredura de contraste de texto calculada em 1280x900 nos estados inicial e de erro (nenhuma reprovação); verificação de reflow em 320x640. Limitações e pontos incertos, não reportados como achados: (a) o papel combobox está no div .br-input e não no input focável (#servico/#unidade não expõem aria-expanded/aria-controls) — padrão do próprio design system, aplicabilidade incerta sem oráculo; (b) após escolher uma opção do select pelo teclado o foco vai para <body> em vez de voltar ao input; (c) o botão do calendário (#data-preferencial-btn) tem aria-hidden=\"true\" e tabindex=\"-1\", ficando indisponível a teclado e a leitores de tela, embora a data possa ser digitada; (d) em 320x640 a página rola horizontalmente (scrollWidth 545 vs clientWidth 305) por causa da tabela de solicitações anteriores, caso possivelmente coberto pela exceção de tabelas de dados do reflow; (e) a data \"30/02/2026\" digitada foi normalizada silenciosamente para \"02/03/2026\"; (f) a solicitação enviada com sucesso não passa a constar na tabela \"Solicitações anteriores\"; (g) o diálogo de seleção de arquivo não pôde ser exercido; (h) único erro de console é 404 de /favicon.ico. Todos os seletores enviados foram executados com document.querySelectorAll na página e resolvem para exatamente 1 elemento."
}
````

### Decisão

````json
{
  "cardId": "C-1eb87212f702e1064075fe9e3f7a712df9c6d3f187a335853a35a0ff150d9d3e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-21eae35992e586bb8203aa602742e30eb840c076f2077629ac86fdbbe89497d4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O campo declara o formato exigido em #cpf-apoio ("Somente números, 11 dígitos.") e é aria-required, mas o envio com o valor "123" foi aceito: nenhuma mensagem de erro foi gerada para o CPF e o formulário retornou "Solicitação enviada. Acompanhe o andamento em Solicitações anteriores." com #cpf.value === "123". A validação do campo só rejeita valor vazio.

Esperado: O CPF informado deve ser validado contra a regra declarada na própria tela (11 dígitos numéricos) e, se inválido, o envio deve ser bloqueado com mensagem de erro no campo, como ocorre para o campo vazio.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. preencher Nome "Maria Souza" e CPF "123" 3. selecionar Tipo de serviço "Segunda via de documento" e Unidade "Agência Centro" 4. marcar Forma de atendimento "Presencial" pelo teclado 5. preencher Data preferencial e Descrição 6. marcar a declaração 7. clicar em Enviar

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(2)>div:nth-of-type(2)>div>input" — <input#cpf> "00000000000"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T03-18-16-252Z.yml (estado após envio)` → não encontrado na evidência preservada da execução
- `browser_evaluate: {msg:"Solicitação enviada...", errors:[], invalids:[], values:{cpf:"123"}}` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      "#cpf-apoio",
      ".acao-enviar"
    ],
    "rule": null,
    "observed": "O campo declara o formato exigido em #cpf-apoio (\"Somente números, 11 dígitos.\") e é aria-required, mas o envio com o valor \"123\" foi aceito: nenhuma mensagem de erro foi gerada para o CPF e o formulário retornou \"Solicitação enviada. Acompanhe o andamento em Solicitações anteriores.\" com #cpf.value === \"123\". A validação do campo só rejeita valor vazio.",
    "expected": "O CPF informado deve ser validado contra a regra declarada na própria tela (11 dígitos numéricos) e, se inválido, o envio deve ser bloqueado com mensagem de erro no campo, como ocorre para o campo vazio.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "preencher Nome \"Maria Souza\" e CPF \"123\"",
        "selecionar Tipo de serviço \"Segunda via de documento\" e Unidade \"Agência Centro\"",
        "marcar Forma de atendimento \"Presencial\" pelo teclado",
        "preencher Data preferencial e Descrição",
        "marcar a declaração",
        "clicar em Enviar"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T03-18-16-252Z.yml (estado após envio)",
      "browser_evaluate: {msg:\"Solicitação enviada...\", errors:[], invalids:[], values:{cpf:\"123\"}}"
    ]
  },
  "scope": [
    "tela inteira /solicitacao.html: skiplink, cabeçalho, breadcrumb, formulário de solicitação (nome, CPF, dois selects br-select, grupo de rádios, datetimepicker, textarea, upload, grupo de checkboxes, declaração, ações), mensagens de retorno de envio, tabela \"Solicitações anteriores\" e paginação"
  ],
  "notes": "Sem oráculo de regras nesta execução: nenhuma ferramenta de consulta de regras, scan_page ou verificação heurística estava disponível; as atribuições usam wcag:<critério> apenas quando justificáveis e rule:null quando não. Interações realizadas: carga inicial e árvore de acessibilidade; Tab a partir do topo (13 paradas registradas por listener de focusin); abertura dos dois selects por mouse e por teclado (ArrowDown/Enter) com verificação de aria-expanded e valor; clique no rótulo \"Presencial\" e seleção do mesmo rádio por Espaço; envio do formulário vazio (mensagem \"Há 8 campo(s) obrigatório(s) sem preenchimento\", foco movido para o role=alert) e inspeção de aria-invalid/aria-describedby de todos os campos; fechamento da mensagem de erro pelo teclado (Enter no div role=button, funcionou); preenchimento completo e envio bem-sucedido; clique em \"Página 2\" da paginação; varredura de contraste de texto calculada em 1280x900 nos estados inicial e de erro (nenhuma reprovação); verificação de reflow em 320x640. Limitações e pontos incertos, não reportados como achados: (a) o papel combobox está no div .br-input e não no input focável (#servico/#unidade não expõem aria-expanded/aria-controls) — padrão do próprio design system, aplicabilidade incerta sem oráculo; (b) após escolher uma opção do select pelo teclado o foco vai para <body> em vez de voltar ao input; (c) o botão do calendário (#data-preferencial-btn) tem aria-hidden=\"true\" e tabindex=\"-1\", ficando indisponível a teclado e a leitores de tela, embora a data possa ser digitada; (d) em 320x640 a página rola horizontalmente (scrollWidth 545 vs clientWidth 305) por causa da tabela de solicitações anteriores, caso possivelmente coberto pela exceção de tabelas de dados do reflow; (e) a data \"30/02/2026\" digitada foi normalizada silenciosamente para \"02/03/2026\"; (f) a solicitação enviada com sucesso não passa a constar na tabela \"Solicitações anteriores\"; (g) o diálogo de seleção de arquivo não pôde ser exercido; (h) único erro de console é 404 de /favicon.ico. Todos os seletores enviados foram executados com document.querySelectorAll na página e resolvem para exatamente 1 elemento."
}
````

### Decisão

````json
{
  "cardId": "C-21eae35992e586bb8203aa602742e30eb840c076f2077629ac86fdbbe89497d4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3499c99fc4913ce4572a867939a34e8563a73b7edcf1c76c4b3bba33b3cd8016

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Apos submeter o formulario vazio, #unidade recebe aria-invalid="true" e e exibida a mensagem visivel 'Selecione a unidade de atendimento.' em <span class="feedback danger retorno-campo" role="alert">, mas esse span nao tem id e o aria-describedby de #unidade e null: a mensagem nao esta associada ao campo.

Esperado: A mensagem de erro deve ter id e ser referenciada no aria-describedby do campo, como ja ocorre nos demais campos obrigatorios do formulario.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar no botao Enviar com o formulario vazio

Regra declarada: emag-6.6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `scan S-page-002, fingerprint sha256:d5b6611b292acc6a60122b1b11cced0ffc4bbf8b08b89eb0931727830eef2d86` → identificador devolvido por ferramenta (sem arquivo)
- `DOM no estado de erro: #unidade aria-invalid=true, aria-describedby=null` → identificador devolvido por ferramenta (sem arquivo)
- `DOM: span.feedback.retorno-campo de .campo-unidade sem atributo id` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#unidade",
    "relatedSelectors": [
      ".campo-unidade .feedback.retorno-campo"
    ],
    "rule": "emag-6.6",
    "observed": "Apos submeter o formulario vazio, #unidade recebe aria-invalid=\"true\" e e exibida a mensagem visivel 'Selecione a unidade de atendimento.' em <span class=\"feedback danger retorno-campo\" role=\"alert\">, mas esse span nao tem id e o aria-describedby de #unidade e null: a mensagem nao esta associada ao campo.",
    "expected": "A mensagem de erro deve ter id e ser referenciada no aria-describedby do campo, como ja ocorre nos demais campos obrigatorios do formulario.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar no botao Enviar com o formulario vazio"
      ]
    },
    "evidence": [
      "scan S-page-002, fingerprint sha256:d5b6611b292acc6a60122b1b11cced0ffc4bbf8b08b89eb0931727830eef2d86",
      "DOM no estado de erro: #unidade aria-invalid=true, aria-describedby=null",
      "DOM: span.feedback.retorno-campo de .campo-unidade sem atributo id"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao, secao Solicitacoes anteriores (tabela + paginacao)",
    "estados: carga inicial, erro de validacao apos Enviar vazio, envio bem-sucedido, lista do br-select aberta, calendario do br-datetimepicker aberto"
  ],
  "notes": "Interacoes realizadas: carga inicial em 1280x900; snapshot da arvore de acessibilidade; tabulacao a partir de pagina recem-carregada (primeiro Tab); clique em Enviar com formulario vazio; foco e acionamento do botao de fechar da mensagem de erro com Enter e com Space (ambos funcionam e removem a mensagem); abertura da lista de #servico e de #unidade por ArrowDown e selecao por Enter (aria-expanded alterna corretamente e o foco vai para o primeiro br-item); Enter dentro de #servico dispara submissao implicita do formulario (comportamento nativo, nao tratado como defeito); preenchimento completo e envio bem-sucedido (mensagem br-message success, aria-invalid limpos, foco movido para .content[role=alert]); abertura do calendario pelo botao #data-preferencial-btn e inspecao dos controles de mes; leitura de CSS computado e de regras de origem para distinguir folha do @govbr-ds/core da folha da aplicacao. Varreduras do oraculo: S-page-001 (estado inicial, fingerprint sha256:fec51e82...) e S-page-002 (estado de erro, fingerprint sha256:d5b6611b...). Candidatos rejeitados e por que: (a) as 6 deteccoes ds-token-spacing/ds-token-radius (#descricao 6px, #servico e #unidade padding 29px, .br-list margin -2px, select do flatpickr) foram rejeitadas - verify_finding V-001 devolveu verdict=rejected, applicability=fail, 'verificacao deterministica sem norma nomeada nao produz achado' (D-27), e a inspecao de origem mostrou que todos esses valores vem da folha do proprio @govbr-ds/core (jsx-runtime-B-RTDNcS.css), nao da aplicacao; (b) ds-structure-button-tag no <a class='br-button circle'> do breadcrumb e no <div class='br-button' role='button'> do fechar da mensagem de erro - rejeitado por V-003 pelo mesmo motivo de ausencia de norma nomeada, e no caso do breadcrumb o exemplo canonico breadcrumb-default do proprio DS usa exatamente <a class='br-button circle'>; o div com role=button tem nome acessivel e responde a Enter e a Space, entao nao restou violacao normativa a citar; (c) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - coincide com os exemplos canonicos datetimepicker-simple/range/time do DS, rejeitado; (d) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos pagination-default/sizes/ellipsis tambem usam apenas a classe active e o oraculo nao expoe regra para isso: classificado como incerto e nao reportado; (e) ausencia de <ul>/<li> envolvendo os itens da paginacao e classes fora do vocabulario canonico (trilha-servico, acao-enviar, tabela-anteriores etc.) - o proprio oraculo as trata como observacao sem norma; (f) #servico mantem aria-invalid='true' e a mensagem de erro depois de a opcao ser escolhida (a limpeza so ocorre em nova submissao) - nao encontrei norma que exija revalidacao imediata, fica como incerto; (g) apos fechar a mensagem de erro o foco volta para <body> - incerto, nao reportado. Limitacoes: axe-core 4.12.1 rodou com 0 resultados incomplete e nenhuma violacao de contraste; emag-6.2, emag-6.3 e emag-2.2 nao tem predicado mecanico no oraculo (verify_finding V-002 e V-004 devolveram 'no-predicate' com ruleExists=pass, applicability=pass e evidenceConsistent=pass), de modo que esses achados se apoiam em inspecao direta do DOM, do CSS computado e da operacao por teclado, e nao em confirmacao mecanica; nao foi possivel exercitar o envio real de arquivo no input de upload; nao foram avaliados outros viewports alem de 1280x900."
}
````

### Decisão

````json
{
  "cardId": "C-3499c99fc4913ce4572a867939a34e8563a73b7edcf1c76c4b3bba33b3cd8016",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-36ec53336454132249051349f7b9b26761add9ce6d489c22be218dd431650b68

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Após enviar o formulário vazio, #servico recebe aria-invalid="true" e é inserido <span class="feedback danger retorno-campo" role="alert">Selecione o tipo de serviço.</span>, mas esse span não tem id e #servico permanece com aria-describedby=null. Dos 8 campos em erro, 6 associam a mensagem por id (nome-retorno, cpf-retorno, forma-retorno, data-retorno, descricao-retorno, declaracao-retorno).

Esperado: A mensagem de erro deve ser vinculada ao campo em erro por aria-describedby, como nos demais campos do mesmo formulário.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em Enviar com o formulário vazio

Regra declarada: emag:6.6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(1)>div>div:nth-of-type(1)>div>input" — <input#servico> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-a10dcb076ad236543b32667bd7e0adfec72fef26085a4924a9eb55ecf74492e3 — A-08 · apos-envio-vazio · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4c4e6005ce86b914ed8b58011b3f8effcee1326c119327ddd4eb9e9e0540a41 — A-04 · sempre · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `govbr-ds-validator verify_finding V-001 (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate)` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate no estado de erro: #servico aria-describedby=null; .retorno-campo:not([id]) resolve 2 elementos (servico e unidade); .retorno-campo[id] resolve 6` → identificador devolvido por ferramenta (sem arquivo)
- `playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-11-10-864Z.yml` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#servico",
    "relatedSelectors": [
      ".campo-servico .retorno-campo"
    ],
    "rule": "emag:6.6",
    "observed": "Após enviar o formulário vazio, #servico recebe aria-invalid=\"true\" e é inserido <span class=\"feedback danger retorno-campo\" role=\"alert\">Selecione o tipo de serviço.</span>, mas esse span não tem id e #servico permanece com aria-describedby=null. Dos 8 campos em erro, 6 associam a mensagem por id (nome-retorno, cpf-retorno, forma-retorno, data-retorno, descricao-retorno, declaracao-retorno).",
    "expected": "A mensagem de erro deve ser vinculada ao campo em erro por aria-describedby, como nos demais campos do mesmo formulário.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em Enviar com o formulário vazio"
      ]
    },
    "evidence": [
      "govbr-ds-validator verify_finding V-001 (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate)",
      "browser_evaluate no estado de erro: #servico aria-describedby=null; .retorno-campo:not([id]) resolve 2 elementos (servico e unidade); .retorno-campo[id] resolve 6",
      "playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-11-10-864Z.yml"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-36ec53336454132249051349f7b9b26761add9ce6d489c22be218dd431650b68",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3846d8d8c5326981d61f6b37add1e80cc4e14c3bfdc15e578a9034a70065c522

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: padding: 0px 29px 0px 40px (fora da escala: 29px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#unidade",
    "rule": "ds:token-spacing",
    "observed": "padding: 0px 29px 0px 40px (fora da escala: 29px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-3846d8d8c5326981d61f6b37add1e80cc4e14c3bfdc15e578a9034a70065c522",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4152c062b55b3475447592c0227901211404fcc9a88eb0715030708f65d42399

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botao tem tabindex="1" (positivo). Na pagina recem-carregada, o primeiro Tab leva o foco diretamente a esse botao, saltando o link 'Ir para o conteudo', o cabecalho, o breadcrumb e todos os campos do formulario que o antecedem (nome, CPF, tipo de servico, unidade, forma de atendimento, data, descricao).

Esperado: Nao usar tabindex positivo: sem o atributo (ou com tabindex="0") o botao seguiria a ordem do DOM, entre o campo de descricao e o grupo de recursos de acessibilidade.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. pressionar Tab uma vez

Regra declarada: emag-6.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `observacao direta: apos reload, Tab #1 deixa document.activeElement = button.upload-button (tabindex=1)` → identificador devolvido por ferramenta (sem arquivo)
- `verify_finding V-002: ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate` → identificador devolvido por ferramenta (sem arquivo)
- `unico elemento da pagina com tabindex positivo` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "rule": "emag-6.3",
    "observed": "O botao tem tabindex=\"1\" (positivo). Na pagina recem-carregada, o primeiro Tab leva o foco diretamente a esse botao, saltando o link 'Ir para o conteudo', o cabecalho, o breadcrumb e todos os campos do formulario que o antecedem (nome, CPF, tipo de servico, unidade, forma de atendimento, data, descricao).",
    "expected": "Nao usar tabindex positivo: sem o atributo (ou com tabindex=\"0\") o botao seguiria a ordem do DOM, entre o campo de descricao e o grupo de recursos de acessibilidade.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "pressionar Tab uma vez"
      ]
    },
    "evidence": [
      "observacao direta: apos reload, Tab #1 deixa document.activeElement = button.upload-button (tabindex=1)",
      "verify_finding V-002: ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate",
      "unico elemento da pagina com tabindex positivo"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao, secao Solicitacoes anteriores (tabela + paginacao)",
    "estados: carga inicial, erro de validacao apos Enviar vazio, envio bem-sucedido, lista do br-select aberta, calendario do br-datetimepicker aberto"
  ],
  "notes": "Interacoes realizadas: carga inicial em 1280x900; snapshot da arvore de acessibilidade; tabulacao a partir de pagina recem-carregada (primeiro Tab); clique em Enviar com formulario vazio; foco e acionamento do botao de fechar da mensagem de erro com Enter e com Space (ambos funcionam e removem a mensagem); abertura da lista de #servico e de #unidade por ArrowDown e selecao por Enter (aria-expanded alterna corretamente e o foco vai para o primeiro br-item); Enter dentro de #servico dispara submissao implicita do formulario (comportamento nativo, nao tratado como defeito); preenchimento completo e envio bem-sucedido (mensagem br-message success, aria-invalid limpos, foco movido para .content[role=alert]); abertura do calendario pelo botao #data-preferencial-btn e inspecao dos controles de mes; leitura de CSS computado e de regras de origem para distinguir folha do @govbr-ds/core da folha da aplicacao. Varreduras do oraculo: S-page-001 (estado inicial, fingerprint sha256:fec51e82...) e S-page-002 (estado de erro, fingerprint sha256:d5b6611b...). Candidatos rejeitados e por que: (a) as 6 deteccoes ds-token-spacing/ds-token-radius (#descricao 6px, #servico e #unidade padding 29px, .br-list margin -2px, select do flatpickr) foram rejeitadas - verify_finding V-001 devolveu verdict=rejected, applicability=fail, 'verificacao deterministica sem norma nomeada nao produz achado' (D-27), e a inspecao de origem mostrou que todos esses valores vem da folha do proprio @govbr-ds/core (jsx-runtime-B-RTDNcS.css), nao da aplicacao; (b) ds-structure-button-tag no <a class='br-button circle'> do breadcrumb e no <div class='br-button' role='button'> do fechar da mensagem de erro - rejeitado por V-003 pelo mesmo motivo de ausencia de norma nomeada, e no caso do breadcrumb o exemplo canonico breadcrumb-default do proprio DS usa exatamente <a class='br-button circle'>; o div com role=button tem nome acessivel e responde a Enter e a Space, entao nao restou violacao normativa a citar; (c) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - coincide com os exemplos canonicos datetimepicker-simple/range/time do DS, rejeitado; (d) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos pagination-default/sizes/ellipsis tambem usam apenas a classe active e o oraculo nao expoe regra para isso: classificado como incerto e nao reportado; (e) ausencia de <ul>/<li> envolvendo os itens da paginacao e classes fora do vocabulario canonico (trilha-servico, acao-enviar, tabela-anteriores etc.) - o proprio oraculo as trata como observacao sem norma; (f) #servico mantem aria-invalid='true' e a mensagem de erro depois de a opcao ser escolhida (a limpeza so ocorre em nova submissao) - nao encontrei norma que exija revalidacao imediata, fica como incerto; (g) apos fechar a mensagem de erro o foco volta para <body> - incerto, nao reportado. Limitacoes: axe-core 4.12.1 rodou com 0 resultados incomplete e nenhuma violacao de contraste; emag-6.2, emag-6.3 e emag-2.2 nao tem predicado mecanico no oraculo (verify_finding V-002 e V-004 devolveram 'no-predicate' com ruleExists=pass, applicability=pass e evidenceConsistent=pass), de modo que esses achados se apoiam em inspecao direta do DOM, do CSS computado e da operacao por teclado, e nao em confirmacao mecanica; nao foi possivel exercitar o envio real de arquivo no input de upload; nao foram avaliados outros viewports alem de 1280x900."
}
````

### Decisão

````json
{
  "cardId": "C-4152c062b55b3475447592c0227901211404fcc9a88eb0715030708f65d42399",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-44978a37c6859b658fd440adbb11b308677621f4d5866ab3700652b8fe0d5df7

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena fora-do-plano:320x800

Observado: Com a janela em 320x800, a tabela do histórico mantém largura intrínseca de 532.99px e não está dentro do contêiner de rolagem previsto pelo Design System (a regra '.br-table .responsive { overflow: auto; }' existe na folha de estilo, mas não há elemento .responsive na marcação; o estilo computado de .br-table traz overflow-x: visible). Em consequência, document.documentElement.scrollWidth passa a 549px contra innerWidth de 320px e a rolagem horizontal atinge a página inteira; a tabela e suas 21 linhas e células são os únicos elementos que ultrapassam a viewport, pois o restante do formulário reflui normalmente.

Esperado: A 320px de largura o conteúdo não deve exigir rolagem horizontal da página: a tabela deve ficar dentro de um contêiner com rolagem própria (por exemplo o .responsive do Design System), confinando a rolagem lateral à própria tabela.

Janela: 320×800 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. redimensionar a janela para 320x800 3. comparar document.documentElement.scrollWidth com window.innerWidth 4. listar elementos cujo limite direito ultrapassa a viewport 5. ler o estilo computado de .br-table e as regras CSS de .br-table

Regra declarada: wcag:1.4.10

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: janela-fora-do-plano: 320x800; sujeitos lidos na cena 1280x900, sem âncora em unidade

### Sujeitos

- "body>div:nth-of-type(1)>div>main>section>div>table" — <table> "Protocolo Serviço Data Situação 2026.0918.004417"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_resize 320x800` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: winW=320, docW=549, horizontalScroll=true, overflowCount=21 (TABLE/THEAD/TBODY/TR/TH/TD)` → não encontrado na evidência preservada da execução
- `browser_evaluate: brTableOverflowX=visible, tableWidth=532.99px, regra '.br-table .responsive { overflow: auto; }' presente e não utilizada` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".tabela-anteriores table",
    "relatedSelectors": [
      ".tabela-anteriores"
    ],
    "rule": "wcag:1.4.10",
    "observed": "Com a janela em 320x800, a tabela do histórico mantém largura intrínseca de 532.99px e não está dentro do contêiner de rolagem previsto pelo Design System (a regra '.br-table .responsive { overflow: auto; }' existe na folha de estilo, mas não há elemento .responsive na marcação; o estilo computado de .br-table traz overflow-x: visible). Em consequência, document.documentElement.scrollWidth passa a 549px contra innerWidth de 320px e a rolagem horizontal atinge a página inteira; a tabela e suas 21 linhas e células são os únicos elementos que ultrapassam a viewport, pois o restante do formulário reflui normalmente.",
    "expected": "A 320px de largura o conteúdo não deve exigir rolagem horizontal da página: a tabela deve ficar dentro de um contêiner com rolagem própria (por exemplo o .responsive do Design System), confinando a rolagem lateral à própria tabela.",
    "state": {
      "viewport": {
        "width": 320,
        "height": 800
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "redimensionar a janela para 320x800",
        "comparar document.documentElement.scrollWidth com window.innerWidth",
        "listar elementos cujo limite direito ultrapassa a viewport",
        "ler o estilo computado de .br-table e as regras CSS de .br-table"
      ]
    },
    "evidence": [
      "browser_resize 320x800",
      "browser_evaluate: winW=320, docW=549, horizontalScroll=true, overflowCount=21 (TABLE/THEAD/TBODY/TR/TH/TD)",
      "browser_evaluate: brTableOverflowX=visible, tableWidth=532.99px, regra '.br-table .responsive { overflow: auto; }' presente e não utilizada"
    ]
  },
  "scope": [
    "solicitacao.html — tela inteira: skiplink, cabeçalho gov.br, breadcrumb, formulário de solicitação (nome, CPF, tipo de serviço, unidade, forma de atendimento, data preferencial, descrição, documentos, recursos de acessibilidade, declaração, ações) e seção 'Solicitações anteriores' com tabela e paginação",
    "estados observados: carga inicial; combobox aberto; formulário submetido vazio (erros); formulário submetido válido (sucesso); paginação na página 2; viewport 320x800"
  ],
  "notes": "Ferramentas usadas: navegação, snapshot da árvore de acessibilidade, avaliação de DOM/CSS computado, teclado e mouse. Interações executadas: Tab a partir do início do documento para verificar ordem de foco; abertura e fechamento dos dois comboboxes por clique e por teclado (ArrowDown/Enter); seleção de opções; clique no rótulo 'Presencial' e no input correspondente; navegação por ArrowUp dentro do grupo de rádio; preenchimento de nome, CPF, data e descrição; submissão com campos vazios e verificação das mensagens de erro, de aria-invalid, de aria-describedby e do destino do foco; fechamento da mensagem de erro por Enter no controle 'Fechar a mensagem' (funcionou); submissão válida completa e verificação da mensagem de sucesso (role=alert, foco movido, aria-invalid limpo); clique em 'Página 2' da paginação; redimensionamento para 320x800 e medição de transbordo. Contraste verificado por cálculo de razão em 23 combinações de texto e fundo (rótulos, textos de apoio, mensagens, botões, breadcrumb, paginação, tabela, skiplink): todas passaram em AA, nenhum achado de contraste. Indicadores de foco verificados em 16 controles. Limitações: nenhum oráculo de regras nem ferramenta scan_page/verificação heurística estava disponível nesta execução, portanto não há identificadores de regra devolvidos por ferramenta; as atribuições usam critérios WCAG que consigo justificar pela observação, e os candidatos que não consegui atribuir com segurança foram deixados fora dos achados e estão declarados aqui como incertos. Incertos (observados, não reportados como achado por atribuição normativa insegura ou por serem possivelmente o comportamento padrão do Design System gov.br, não um defeito da tela): (1) o skiplink usa nav[role=menubar] com a[role=menuitem] para um único link de atalho, o que faz leitores de tela anunciarem barra de menus em vez de link; (2) role=combobox está no wrapper div.br-input, que não é focalizável, enquanto o elemento que recebe foco (#servico/#unidade) é exposto como textbox simples, sem aria-expanded — o estado de expansão existe mas fica no wrapper; as opções em role=option não têm aria-selected; (3) o span do item atual do breadcrumb tem tabindex=0, criando uma parada de foco sem ação; (4) a troca de página da tabela não é anunciada (o conteúdo muda sem região viva e o foco permanece no link). O erro 404 de /favicon.ico no console é irrelevante para conformidade. Um único achado usa seletor com dois elementos (#servico, #unidade) porque a mesma regra CSS produz a mesma afirmação para ambos."
}
````

### Decisão

````json
{
  "cardId": "C-44978a37c6859b658fd440adbb11b308677621f4d5866ab3700652b8fe0d5df7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4855a70bc14f2196ac0a925b1dff98aa7aa1dc00d125854199a8fd3d0bacfd7b

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O campo de arquivo #documentos tem display:none (largura e altura 0), portanto não é focalizável nem aparece na árvore de acessibilidade — no snapshot a região de upload expõe apenas texto genérico 'Documentos comprobatórios (opcional)' e um botão. O único controle visível e focalizável, .upload-button, tem aria-hidden="true", ficando removido da árvore de acessibilidade. O rótulo .upload-label[for=documentos] aponta para o input oculto e é exposto como texto solto. Resultado: não há nenhum controle com nome e papel de campo de arquivo disponível para tecnologia assistiva.

Esperado: O envio de documentos deve ter um controle exposto com nome e papel, por exemplo mantendo #documentos focalizável (oculto visualmente, sem display:none) ou removendo aria-hidden="true" de .upload-button, para que a tecnologia assistiva anuncie o campo e sua finalidade.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. tirar snapshot da árvore de acessibilidade 3. ler estilo computado de .upload-input e .upload-button 4. enumerar elementos focalizáveis e elementos com aria-hidden=true

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>input" — <input#documentos> · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T02-44-23-945Z.yml` → `pipeline/logs/2026-09-18T23-14-46-sem-run2-a967f5af-evidencia/.playwright-mcp/page-2026-09-19T02-44-23-945Z.yml` (sha256 3a9e7daaede6)
- `browser_evaluate: uploadInput display=none w=0 h=0; uploadButton aria-hidden=true tabindex=1` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: uploadHTML de .br-upload` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: ariaHiddenFocusable inclui BUTTON.upload-button` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#documentos",
    "relatedSelectors": [
      ".upload-button",
      ".upload-label"
    ],
    "rule": "wcag:4.1.2",
    "observed": "O campo de arquivo #documentos tem display:none (largura e altura 0), portanto não é focalizável nem aparece na árvore de acessibilidade — no snapshot a região de upload expõe apenas texto genérico 'Documentos comprobatórios (opcional)' e um botão. O único controle visível e focalizável, .upload-button, tem aria-hidden=\"true\", ficando removido da árvore de acessibilidade. O rótulo .upload-label[for=documentos] aponta para o input oculto e é exposto como texto solto. Resultado: não há nenhum controle com nome e papel de campo de arquivo disponível para tecnologia assistiva.",
    "expected": "O envio de documentos deve ter um controle exposto com nome e papel, por exemplo mantendo #documentos focalizável (oculto visualmente, sem display:none) ou removendo aria-hidden=\"true\" de .upload-button, para que a tecnologia assistiva anuncie o campo e sua finalidade.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "tirar snapshot da árvore de acessibilidade",
        "ler estilo computado de .upload-input e .upload-button",
        "enumerar elementos focalizáveis e elementos com aria-hidden=true"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T02-44-23-945Z.yml",
      "browser_evaluate: uploadInput display=none w=0 h=0; uploadButton aria-hidden=true tabindex=1",
      "browser_evaluate: uploadHTML de .br-upload",
      "browser_evaluate: ariaHiddenFocusable inclui BUTTON.upload-button"
    ]
  },
  "scope": [
    "solicitacao.html — tela inteira: skiplink, cabeçalho gov.br, breadcrumb, formulário de solicitação (nome, CPF, tipo de serviço, unidade, forma de atendimento, data preferencial, descrição, documentos, recursos de acessibilidade, declaração, ações) e seção 'Solicitações anteriores' com tabela e paginação",
    "estados observados: carga inicial; combobox aberto; formulário submetido vazio (erros); formulário submetido válido (sucesso); paginação na página 2; viewport 320x800"
  ],
  "notes": "Ferramentas usadas: navegação, snapshot da árvore de acessibilidade, avaliação de DOM/CSS computado, teclado e mouse. Interações executadas: Tab a partir do início do documento para verificar ordem de foco; abertura e fechamento dos dois comboboxes por clique e por teclado (ArrowDown/Enter); seleção de opções; clique no rótulo 'Presencial' e no input correspondente; navegação por ArrowUp dentro do grupo de rádio; preenchimento de nome, CPF, data e descrição; submissão com campos vazios e verificação das mensagens de erro, de aria-invalid, de aria-describedby e do destino do foco; fechamento da mensagem de erro por Enter no controle 'Fechar a mensagem' (funcionou); submissão válida completa e verificação da mensagem de sucesso (role=alert, foco movido, aria-invalid limpo); clique em 'Página 2' da paginação; redimensionamento para 320x800 e medição de transbordo. Contraste verificado por cálculo de razão em 23 combinações de texto e fundo (rótulos, textos de apoio, mensagens, botões, breadcrumb, paginação, tabela, skiplink): todas passaram em AA, nenhum achado de contraste. Indicadores de foco verificados em 16 controles. Limitações: nenhum oráculo de regras nem ferramenta scan_page/verificação heurística estava disponível nesta execução, portanto não há identificadores de regra devolvidos por ferramenta; as atribuições usam critérios WCAG que consigo justificar pela observação, e os candidatos que não consegui atribuir com segurança foram deixados fora dos achados e estão declarados aqui como incertos. Incertos (observados, não reportados como achado por atribuição normativa insegura ou por serem possivelmente o comportamento padrão do Design System gov.br, não um defeito da tela): (1) o skiplink usa nav[role=menubar] com a[role=menuitem] para um único link de atalho, o que faz leitores de tela anunciarem barra de menus em vez de link; (2) role=combobox está no wrapper div.br-input, que não é focalizável, enquanto o elemento que recebe foco (#servico/#unidade) é exposto como textbox simples, sem aria-expanded — o estado de expansão existe mas fica no wrapper; as opções em role=option não têm aria-selected; (3) o span do item atual do breadcrumb tem tabindex=0, criando uma parada de foco sem ação; (4) a troca de página da tabela não é anunciada (o conteúdo muda sem região viva e o foco permanece no link). O erro 404 de /favicon.ico no console é irrelevante para conformidade. Um único achado usa seletor com dois elementos (#servico, #unidade) porque a mesma regra CSS produz a mesma afirmação para ambos."
}
````

### Decisão

````json
{
  "cardId": "C-4855a70bc14f2196ac0a925b1dff98aa7aa1dc00d125854199a8fd3d0bacfd7b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4896a950335db93f5bf80b85cda819c61feba3738d11adbe3a140d63fc657a8e

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: br-button aplicado a <a>

Esperado: Elemento <button>

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:structure-button-tag

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(1)>div>nav:nth-of-type(2)>ol>li:nth-of-type(1)>a" — <a> "Página inicial"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > div > nav:nth-of-type(2) > ol > li:nth-of-type(1) > a",
    "rule": "ds:structure-button-tag",
    "observed": "br-button aplicado a <a>",
    "expected": "Elemento <button>",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-4896a950335db93f5bf80b85cda819c61feba3738d11adbe3a140d63fc657a8e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4a8827bc3cc214362ce630026fa3cc2d1bdfcfb2cc7f061786d616a2c1a1b114

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Selecionando uma opção só pelo teclado (foco no campo, ArrowDown para entrar na lista, Enter sobre o .br-item), o valor é preenchido e a lista fecha, mas document.activeElement passa a ser <body>. Reproduzido nos dois campos: #servico ficou "Emissão de certidão" e #unidade ficou "Agência Centro", ambos com foco em BODY.

Esperado: Ao fechar a lista após a seleção, o foco deve voltar ao campo do combobox correspondente, para que o usuário de teclado continue de onde parou em vez de tabular desde o início do documento.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em #servico para abrir a lista 3. ArrowDown 4. Enter 5. focar #unidade 6. ArrowDown 7. Enter

Regra declarada: emag:2.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(1)>div>div:nth-of-type(1)>div>input" — <input#servico> "Selecione uma opção"
- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a10dcb076ad236543b32667bd7e0adfec72fef26085a4924a9eb55ecf74492e3 — A-08 · apos-envio-vazio · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4c4e6005ce86b914ed8b58011b3f8effcee1326c119327ddd4eb9e9e0540a41 — A-04 · sempre · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate após Enter em #servico: value="Emissão de certidão", aria-expanded="false", document.activeElement === document.body` → não encontrado na evidência preservada da execução
- `browser_evaluate após Enter em #unidade: value="Agência Centro", document.activeElement === document.body` → não encontrado na evidência preservada da execução
- `playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-05-57-996Z.yml` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#servico, #unidade",
    "relatedSelectors": [
      ".campo-servico .br-list",
      ".campo-unidade .br-list"
    ],
    "rule": "emag:2.1",
    "observed": "Selecionando uma opção só pelo teclado (foco no campo, ArrowDown para entrar na lista, Enter sobre o .br-item), o valor é preenchido e a lista fecha, mas document.activeElement passa a ser <body>. Reproduzido nos dois campos: #servico ficou \"Emissão de certidão\" e #unidade ficou \"Agência Centro\", ambos com foco em BODY.",
    "expected": "Ao fechar a lista após a seleção, o foco deve voltar ao campo do combobox correspondente, para que o usuário de teclado continue de onde parou em vez de tabular desde o início do documento.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em #servico para abrir a lista",
        "ArrowDown",
        "Enter",
        "focar #unidade",
        "ArrowDown",
        "Enter"
      ]
    },
    "evidence": [
      "browser_evaluate após Enter em #servico: value=\"Emissão de certidão\", aria-expanded=\"false\", document.activeElement === document.body",
      "browser_evaluate após Enter em #unidade: value=\"Agência Centro\", document.activeElement === document.body",
      "playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-05-57-996Z.yml"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-4a8827bc3cc214362ce630026fa3cc2d1bdfcfb2cc7f061786d616a2c1a1b114",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4b40d76d40799ae88546815bc04062952049385b1d8442de7c03780fea9a7a29

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A página corrente da paginação é indicada apenas pela classe CSS "active" (<a class="page active" aria-label="Página 1" href="#titulo-historico">1</a>); não há aria-current. Após clicar em "Página 2", a classe migra para o link 2 (data-current="2") e continua sem aria-current, enquanto o breadcrumb da mesma tela usa aria-current="page".

Esperado: O link da página corrente deve expor a condição programaticamente com aria-current="page", e não somente por estilo visual.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. rolar até "Solicitações anteriores" 3. clicar em "Página 2"

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>section>div>div:nth-of-type(2)>nav>a:nth-of-type(1)" — <a> "Página 1"

### Unidades candidatas (não são crédito)

- U-6b2335b7d8c3ff70b8ef3ca3533d672b6a1a6611d3db662a510e1380f65145a5 — A-07 · sempre · cena 1280x900 · <nav> "Paginação de solicitações anteriores": Estrato E · variante links-fora-de-lista. Os links de página são âncoras adjacentes soltas dentro do <nav>, sem o <ul>/<li> do exemplo oficial: nada além de espaço os separa. Sem predicado na referência (nenhuma espécie mede o elemento pai); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-fa46b3b01953095c45ccd4ee7da378bc7eaab3a1936698faa3f365516a5be29e — A-12 · sempre · cena 1280x900 · <nav> "Paginação de solicitações anteriores": Estrato S · variante aria-removido. A página ativa da paginação é marcada só pela classe `active`: nenhum link carrega aria-current="page", o estado que o próprio DS escreve em tempo de execução. A trilha de navegação da mesma tela marca a página atual com aria-current.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-current. Medido: ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T03-18-54-512Z.yml (paginação na página 2)` → não encontrado na evidência preservada da execução
- `browser_evaluate: outerHTML do nav com data-current="2" e <a class="page active" aria-label="Página 2"> sem aria-current` → identificador devolvido por ferramenta (sem arquivo)
- `snapshot inicial: "link \"Página 1\"" sem estado de página atual` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": ".paginacao-anteriores a.page.active",
    "relatedSelectors": [
      ".paginacao-anteriores"
    ],
    "rule": "wcag:1.3.1",
    "observed": "A página corrente da paginação é indicada apenas pela classe CSS \"active\" (<a class=\"page active\" aria-label=\"Página 1\" href=\"#titulo-historico\">1</a>); não há aria-current. Após clicar em \"Página 2\", a classe migra para o link 2 (data-current=\"2\") e continua sem aria-current, enquanto o breadcrumb da mesma tela usa aria-current=\"page\".",
    "expected": "O link da página corrente deve expor a condição programaticamente com aria-current=\"page\", e não somente por estilo visual.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "rolar até \"Solicitações anteriores\"",
        "clicar em \"Página 2\""
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T03-18-54-512Z.yml (paginação na página 2)",
      "browser_evaluate: outerHTML do nav com data-current=\"2\" e <a class=\"page active\" aria-label=\"Página 2\"> sem aria-current",
      "snapshot inicial: \"link \\\"Página 1\\\"\" sem estado de página atual"
    ]
  },
  "scope": [
    "tela inteira /solicitacao.html: skiplink, cabeçalho, breadcrumb, formulário de solicitação (nome, CPF, dois selects br-select, grupo de rádios, datetimepicker, textarea, upload, grupo de checkboxes, declaração, ações), mensagens de retorno de envio, tabela \"Solicitações anteriores\" e paginação"
  ],
  "notes": "Sem oráculo de regras nesta execução: nenhuma ferramenta de consulta de regras, scan_page ou verificação heurística estava disponível; as atribuições usam wcag:<critério> apenas quando justificáveis e rule:null quando não. Interações realizadas: carga inicial e árvore de acessibilidade; Tab a partir do topo (13 paradas registradas por listener de focusin); abertura dos dois selects por mouse e por teclado (ArrowDown/Enter) com verificação de aria-expanded e valor; clique no rótulo \"Presencial\" e seleção do mesmo rádio por Espaço; envio do formulário vazio (mensagem \"Há 8 campo(s) obrigatório(s) sem preenchimento\", foco movido para o role=alert) e inspeção de aria-invalid/aria-describedby de todos os campos; fechamento da mensagem de erro pelo teclado (Enter no div role=button, funcionou); preenchimento completo e envio bem-sucedido; clique em \"Página 2\" da paginação; varredura de contraste de texto calculada em 1280x900 nos estados inicial e de erro (nenhuma reprovação); verificação de reflow em 320x640. Limitações e pontos incertos, não reportados como achados: (a) o papel combobox está no div .br-input e não no input focável (#servico/#unidade não expõem aria-expanded/aria-controls) — padrão do próprio design system, aplicabilidade incerta sem oráculo; (b) após escolher uma opção do select pelo teclado o foco vai para <body> em vez de voltar ao input; (c) o botão do calendário (#data-preferencial-btn) tem aria-hidden=\"true\" e tabindex=\"-1\", ficando indisponível a teclado e a leitores de tela, embora a data possa ser digitada; (d) em 320x640 a página rola horizontalmente (scrollWidth 545 vs clientWidth 305) por causa da tabela de solicitações anteriores, caso possivelmente coberto pela exceção de tabelas de dados do reflow; (e) a data \"30/02/2026\" digitada foi normalizada silenciosamente para \"02/03/2026\"; (f) a solicitação enviada com sucesso não passa a constar na tabela \"Solicitações anteriores\"; (g) o diálogo de seleção de arquivo não pôde ser exercido; (h) único erro de console é 404 de /favicon.ico. Todos os seletores enviados foram executados com document.querySelectorAll na página e resolvem para exatamente 1 elemento."
}
````

### Decisão

````json
{
  "cardId": "C-4b40d76d40799ae88546815bc04062952049385b1d8442de7c03780fea9a7a29",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-4d5575e696ae1986a22fe08c20c17f4de392c813ce53a06ead7e9448ef8b9ece

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Os dois botões de navegação de mês do calendário são <button class="br-button circle small" type="button"><i class="fas fas fa-chevron-left"></i></button> e <button ...><i class="fas fa-chevron-right"></i></button>: sem aria-label, sem texto e com o ícone marcado como decorativo, resultando em nome acessível vazio.

Esperado: Botão apenas com ícone precisa de nome acessível via aria-label (por exemplo "Mês anterior" e "Próximo mês"), como nos demais botões circulares da tela ("Página anterior", "Página seguinte", "Abrir calendário").

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar no botão de calendário do campo Data preferencial

Regra declarada: emag:2.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(1)>span:nth-of-type(1)>button" — <button> · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(1)>span:nth-of-type(2)>button" — <button> · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `govbr-ds-validator scan_page S-page-001 findings F-008 e F-009 (emag-2.2, 'Elemento interativo apenas com ícone, sem aria-label (br-button)')` → identificador devolvido por ferramenta (sem arquivo)
- `govbr-ds-validator scan_page S-page-002 findings F-020 e F-021` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate com o calendário aberto: .flatpickr-calendar.open, 2 botões com aria-label=null e textContent vazio` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".flatpickr-prev-month > button, .flatpickr-next-month > button",
    "relatedSelectors": [
      "#data-preferencial-btn"
    ],
    "rule": "emag:2.2",
    "observed": "Os dois botões de navegação de mês do calendário são <button class=\"br-button circle small\" type=\"button\"><i class=\"fas fas fa-chevron-left\"></i></button> e <button ...><i class=\"fas fa-chevron-right\"></i></button>: sem aria-label, sem texto e com o ícone marcado como decorativo, resultando em nome acessível vazio.",
    "expected": "Botão apenas com ícone precisa de nome acessível via aria-label (por exemplo \"Mês anterior\" e \"Próximo mês\"), como nos demais botões circulares da tela (\"Página anterior\", \"Página seguinte\", \"Abrir calendário\").",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar no botão de calendário do campo Data preferencial"
      ]
    },
    "evidence": [
      "govbr-ds-validator scan_page S-page-001 findings F-008 e F-009 (emag-2.2, 'Elemento interativo apenas com ícone, sem aria-label (br-button)')",
      "govbr-ds-validator scan_page S-page-002 findings F-020 e F-021",
      "browser_evaluate com o calendário aberto: .flatpickr-calendar.open, 2 botões com aria-label=null e textContent vazio"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-4d5575e696ae1986a22fe08c20c17f4de392c813ce53a06ead7e9448ef8b9ece",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-5185de19ad85d907e48d98397fe57a963cf6381f728b77ed729ee904c1b079bc

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botão tem aria-hidden="true" e tabindex="1". Um único Tab a partir do topo do documento leva o foco para ele (document.activeElement = button.upload-button, com outline tracejado visível), antes mesmo do skiplink — e, por estar aria-hidden, nenhum nome é exposto a leitores de tela nessa parada.

Esperado: Elemento com aria-hidden="true" não pode ser focalizável: o botão decorativo do br-upload deve ter tabindex="-1", deixando a interação acessível para o par <label for="documentos"> / <input id="documentos" type="file">.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. pressionar Tab uma vez a partir do topo do documento

Regra declarada: emag:2.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `govbr-ds-validator scan_page S-page-001 finding F-010 (axe-core 'aria-hidden-focus', severity serious)` → identificador devolvido por ferramenta (sem arquivo)
- `govbr-ds-validator scan_page S-page-002 finding F-022` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate após browser_press_key Tab: activeElement = BUTTON.upload-button focus-visible, tabindex="1", aria-hidden="true"` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "relatedSelectors": [
      "#documentos",
      ".upload-label"
    ],
    "rule": "emag:2.2",
    "observed": "O botão tem aria-hidden=\"true\" e tabindex=\"1\". Um único Tab a partir do topo do documento leva o foco para ele (document.activeElement = button.upload-button, com outline tracejado visível), antes mesmo do skiplink — e, por estar aria-hidden, nenhum nome é exposto a leitores de tela nessa parada.",
    "expected": "Elemento com aria-hidden=\"true\" não pode ser focalizável: o botão decorativo do br-upload deve ter tabindex=\"-1\", deixando a interação acessível para o par <label for=\"documentos\"> / <input id=\"documentos\" type=\"file\">.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "pressionar Tab uma vez a partir do topo do documento"
      ]
    },
    "evidence": [
      "govbr-ds-validator scan_page S-page-001 finding F-010 (axe-core 'aria-hidden-focus', severity serious)",
      "govbr-ds-validator scan_page S-page-002 finding F-022",
      "browser_evaluate após browser_press_key Tab: activeElement = BUTTON.upload-button focus-visible, tabindex=\"1\", aria-hidden=\"true\""
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-5185de19ad85d907e48d98397fe57a963cf6381f728b77ed729ee904c1b079bc",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-52823235effc265d68dddd8eef4e6941cba057c09cbb3076c8c93cc553af50e7

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: padding: 0px 29px 0px 40px (fora da escala: 29px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(1)>div>div:nth-of-type(1)>div>input" — <input#servico> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-a10dcb076ad236543b32667bd7e0adfec72fef26085a4924a9eb55ecf74492e3 — A-08 · apos-envio-vazio · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4c4e6005ce86b914ed8b58011b3f8effcee1326c119327ddd4eb9e9e0540a41 — A-04 · sempre · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#servico",
    "rule": "ds:token-spacing",
    "observed": "padding: 0px 29px 0px 40px (fora da escala: 29px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-52823235effc265d68dddd8eef4e6941cba057c09cbb3076c8c93cc553af50e7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-56378f8104a1ffcdb037d2103b22142ca5fbbd3d17e105e5612ad31bd068911f

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O rótulo da primeira opção é <label>Presencial</label>, sem atributo for e sem envolver o input. O snapshot da árvore de acessibilidade expõe o controle como 'radio' sem nome, enquanto os irmãos aparecem como 'radio "Por videochamada"' e 'radio "Por telefone"'. Como o input tem opacity:0 e position:absolute e é totalmente coberto pelo rótulo (input e label com mesmo x=193 e y=499.8; elementFromPoint sobre o rótulo devolve o LABEL), o clique é interceptado: após clicar no texto 'Presencial', forma-presencial.checked permaneceu false. A opção só foi marcada por teclado (ArrowUp a partir de forma-video).

Esperado: O rótulo deve estar associado ao controle (for="forma-presencial" ou envolvendo o input), de modo que #forma-presencial tenha nome acessível 'Presencial' e que o clique no rótulo marque a opção, como já ocorre em #forma-video e #forma-telefone.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. tirar snapshot da árvore de acessibilidade 3. clicar no rótulo 'Presencial' 4. ler forma-presencial.checked e getBoundingClientRect do input e do label 5. focar forma-video e pressionar ArrowUp

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>fieldset:nth-of-type(1)>div:nth-of-type(1)>input" — <input#forma-presencial>

### Unidades candidatas (não são crédito)

- U-471fd34bfed8d491133fe60cfe6233aa00117fefb796768495ff7598fa7a6a5e — A-09 · sempre · cena 1280x900 · <input#forma-presencial>: Estrato S · variante label-sem-for, na primeira opção do grupo (convenção registrada em tela-a/construcao.md). O <label> de "Presencial" não tem for: o radio fica sem nome acessível e clicar no texto não o marca. As outras duas opções estão associadas.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: for, aria-label, aria-labelledby. Medido: ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T02-44-23-945Z.yml` → `pipeline/logs/2026-09-18T23-14-46-sem-run2-a967f5af-evidencia/.playwright-mcp/page-2026-09-19T02-44-23-945Z.yml` (sha256 3a9e7daaede6)
- `.playwright-mcp/page-2026-09-19T02-50-03-507Z.yml` → `pipeline/logs/2026-09-18T23-14-46-sem-run2-a967f5af-evidencia/.playwright-mcp/page-2026-09-19T02-50-03-507Z.yml` (sha256 c2ff6858c237)
- `browser_evaluate: formaHTML de .grupo-forma` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: presencialChecked=false, inputOpacity=0, elementAtLabelCenter=LABEL sem for` → identificador devolvido por ferramenta (sem arquivo)
- `browser_click em e56 falhou com '<label>Presencial</label> intercepts pointer events'` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#forma-presencial",
    "relatedSelectors": [
      ".grupo-forma .br-radio:first-of-type label"
    ],
    "rule": "wcag:4.1.2",
    "observed": "O rótulo da primeira opção é <label>Presencial</label>, sem atributo for e sem envolver o input. O snapshot da árvore de acessibilidade expõe o controle como 'radio' sem nome, enquanto os irmãos aparecem como 'radio \"Por videochamada\"' e 'radio \"Por telefone\"'. Como o input tem opacity:0 e position:absolute e é totalmente coberto pelo rótulo (input e label com mesmo x=193 e y=499.8; elementFromPoint sobre o rótulo devolve o LABEL), o clique é interceptado: após clicar no texto 'Presencial', forma-presencial.checked permaneceu false. A opção só foi marcada por teclado (ArrowUp a partir de forma-video).",
    "expected": "O rótulo deve estar associado ao controle (for=\"forma-presencial\" ou envolvendo o input), de modo que #forma-presencial tenha nome acessível 'Presencial' e que o clique no rótulo marque a opção, como já ocorre em #forma-video e #forma-telefone.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "tirar snapshot da árvore de acessibilidade",
        "clicar no rótulo 'Presencial'",
        "ler forma-presencial.checked e getBoundingClientRect do input e do label",
        "focar forma-video e pressionar ArrowUp"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T02-44-23-945Z.yml",
      ".playwright-mcp/page-2026-09-19T02-50-03-507Z.yml",
      "browser_evaluate: formaHTML de .grupo-forma",
      "browser_evaluate: presencialChecked=false, inputOpacity=0, elementAtLabelCenter=LABEL sem for",
      "browser_click em e56 falhou com '<label>Presencial</label> intercepts pointer events'"
    ]
  },
  "scope": [
    "solicitacao.html — tela inteira: skiplink, cabeçalho gov.br, breadcrumb, formulário de solicitação (nome, CPF, tipo de serviço, unidade, forma de atendimento, data preferencial, descrição, documentos, recursos de acessibilidade, declaração, ações) e seção 'Solicitações anteriores' com tabela e paginação",
    "estados observados: carga inicial; combobox aberto; formulário submetido vazio (erros); formulário submetido válido (sucesso); paginação na página 2; viewport 320x800"
  ],
  "notes": "Ferramentas usadas: navegação, snapshot da árvore de acessibilidade, avaliação de DOM/CSS computado, teclado e mouse. Interações executadas: Tab a partir do início do documento para verificar ordem de foco; abertura e fechamento dos dois comboboxes por clique e por teclado (ArrowDown/Enter); seleção de opções; clique no rótulo 'Presencial' e no input correspondente; navegação por ArrowUp dentro do grupo de rádio; preenchimento de nome, CPF, data e descrição; submissão com campos vazios e verificação das mensagens de erro, de aria-invalid, de aria-describedby e do destino do foco; fechamento da mensagem de erro por Enter no controle 'Fechar a mensagem' (funcionou); submissão válida completa e verificação da mensagem de sucesso (role=alert, foco movido, aria-invalid limpo); clique em 'Página 2' da paginação; redimensionamento para 320x800 e medição de transbordo. Contraste verificado por cálculo de razão em 23 combinações de texto e fundo (rótulos, textos de apoio, mensagens, botões, breadcrumb, paginação, tabela, skiplink): todas passaram em AA, nenhum achado de contraste. Indicadores de foco verificados em 16 controles. Limitações: nenhum oráculo de regras nem ferramenta scan_page/verificação heurística estava disponível nesta execução, portanto não há identificadores de regra devolvidos por ferramenta; as atribuições usam critérios WCAG que consigo justificar pela observação, e os candidatos que não consegui atribuir com segurança foram deixados fora dos achados e estão declarados aqui como incertos. Incertos (observados, não reportados como achado por atribuição normativa insegura ou por serem possivelmente o comportamento padrão do Design System gov.br, não um defeito da tela): (1) o skiplink usa nav[role=menubar] com a[role=menuitem] para um único link de atalho, o que faz leitores de tela anunciarem barra de menus em vez de link; (2) role=combobox está no wrapper div.br-input, que não é focalizável, enquanto o elemento que recebe foco (#servico/#unidade) é exposto como textbox simples, sem aria-expanded — o estado de expansão existe mas fica no wrapper; as opções em role=option não têm aria-selected; (3) o span do item atual do breadcrumb tem tabindex=0, criando uma parada de foco sem ação; (4) a troca de página da tabela não é anunciada (o conteúdo muda sem região viva e o foco permanece no link). O erro 404 de /favicon.ico no console é irrelevante para conformidade. Um único achado usa seletor com dois elementos (#servico, #unidade) porque a mesma regra CSS produz a mesma afirmação para ambos."
}
````

### Decisão

````json
{
  "cardId": "C-56378f8104a1ffcdb037d2103b22142ca5fbbd3d17e105e5612ad31bd068911f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-5d1f3f75950edaef62e89b010ad9dfc4fadadbbcc0ee93a6e7b0f4d9789823c0

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Apos submeter o formulario vazio, #servico recebe aria-invalid="true" e e exibida a mensagem visivel 'Selecione o tipo de servico.' em <span class="feedback danger retorno-campo" role="alert">, mas esse span nao tem id e o aria-describedby de #servico e null: a mensagem nao esta associada ao campo.

Esperado: A mensagem de erro deve ter id e ser referenciada no aria-describedby do campo, como ja ocorre em #nome (nome-retorno), #cpf (cpf-retorno), #data-preferencial (data-retorno), #descricao (descricao-retorno) e #declaracao (declaracao-retorno).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar no botao Enviar com o formulario vazio

Regra declarada: emag-6.6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(1)>div>div:nth-of-type(1)>div>input" — <input#servico> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-a10dcb076ad236543b32667bd7e0adfec72fef26085a4924a9eb55ecf74492e3 — A-08 · apos-envio-vazio · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4c4e6005ce86b914ed8b58011b3f8effcee1326c119327ddd4eb9e9e0540a41 — A-04 · sempre · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `scan S-page-002, fingerprint sha256:d5b6611b292acc6a60122b1b11cced0ffc4bbf8b08b89eb0931727830eef2d86` → identificador devolvido por ferramenta (sem arquivo)
- `DOM no estado de erro: #servico aria-invalid=true, aria-describedby=null` → identificador devolvido por ferramenta (sem arquivo)
- `DOM: span.feedback.retorno-campo de .campo-servico sem atributo id` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#servico",
    "relatedSelectors": [
      ".campo-servico .feedback.retorno-campo"
    ],
    "rule": "emag-6.6",
    "observed": "Apos submeter o formulario vazio, #servico recebe aria-invalid=\"true\" e e exibida a mensagem visivel 'Selecione o tipo de servico.' em <span class=\"feedback danger retorno-campo\" role=\"alert\">, mas esse span nao tem id e o aria-describedby de #servico e null: a mensagem nao esta associada ao campo.",
    "expected": "A mensagem de erro deve ter id e ser referenciada no aria-describedby do campo, como ja ocorre em #nome (nome-retorno), #cpf (cpf-retorno), #data-preferencial (data-retorno), #descricao (descricao-retorno) e #declaracao (declaracao-retorno).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar no botao Enviar com o formulario vazio"
      ]
    },
    "evidence": [
      "scan S-page-002, fingerprint sha256:d5b6611b292acc6a60122b1b11cced0ffc4bbf8b08b89eb0931727830eef2d86",
      "DOM no estado de erro: #servico aria-invalid=true, aria-describedby=null",
      "DOM: span.feedback.retorno-campo de .campo-servico sem atributo id"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao, secao Solicitacoes anteriores (tabela + paginacao)",
    "estados: carga inicial, erro de validacao apos Enviar vazio, envio bem-sucedido, lista do br-select aberta, calendario do br-datetimepicker aberto"
  ],
  "notes": "Interacoes realizadas: carga inicial em 1280x900; snapshot da arvore de acessibilidade; tabulacao a partir de pagina recem-carregada (primeiro Tab); clique em Enviar com formulario vazio; foco e acionamento do botao de fechar da mensagem de erro com Enter e com Space (ambos funcionam e removem a mensagem); abertura da lista de #servico e de #unidade por ArrowDown e selecao por Enter (aria-expanded alterna corretamente e o foco vai para o primeiro br-item); Enter dentro de #servico dispara submissao implicita do formulario (comportamento nativo, nao tratado como defeito); preenchimento completo e envio bem-sucedido (mensagem br-message success, aria-invalid limpos, foco movido para .content[role=alert]); abertura do calendario pelo botao #data-preferencial-btn e inspecao dos controles de mes; leitura de CSS computado e de regras de origem para distinguir folha do @govbr-ds/core da folha da aplicacao. Varreduras do oraculo: S-page-001 (estado inicial, fingerprint sha256:fec51e82...) e S-page-002 (estado de erro, fingerprint sha256:d5b6611b...). Candidatos rejeitados e por que: (a) as 6 deteccoes ds-token-spacing/ds-token-radius (#descricao 6px, #servico e #unidade padding 29px, .br-list margin -2px, select do flatpickr) foram rejeitadas - verify_finding V-001 devolveu verdict=rejected, applicability=fail, 'verificacao deterministica sem norma nomeada nao produz achado' (D-27), e a inspecao de origem mostrou que todos esses valores vem da folha do proprio @govbr-ds/core (jsx-runtime-B-RTDNcS.css), nao da aplicacao; (b) ds-structure-button-tag no <a class='br-button circle'> do breadcrumb e no <div class='br-button' role='button'> do fechar da mensagem de erro - rejeitado por V-003 pelo mesmo motivo de ausencia de norma nomeada, e no caso do breadcrumb o exemplo canonico breadcrumb-default do proprio DS usa exatamente <a class='br-button circle'>; o div com role=button tem nome acessivel e responde a Enter e a Space, entao nao restou violacao normativa a citar; (c) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - coincide com os exemplos canonicos datetimepicker-simple/range/time do DS, rejeitado; (d) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos pagination-default/sizes/ellipsis tambem usam apenas a classe active e o oraculo nao expoe regra para isso: classificado como incerto e nao reportado; (e) ausencia de <ul>/<li> envolvendo os itens da paginacao e classes fora do vocabulario canonico (trilha-servico, acao-enviar, tabela-anteriores etc.) - o proprio oraculo as trata como observacao sem norma; (f) #servico mantem aria-invalid='true' e a mensagem de erro depois de a opcao ser escolhida (a limpeza so ocorre em nova submissao) - nao encontrei norma que exija revalidacao imediata, fica como incerto; (g) apos fechar a mensagem de erro o foco volta para <body> - incerto, nao reportado. Limitacoes: axe-core 4.12.1 rodou com 0 resultados incomplete e nenhuma violacao de contraste; emag-6.2, emag-6.3 e emag-2.2 nao tem predicado mecanico no oraculo (verify_finding V-002 e V-004 devolveram 'no-predicate' com ruleExists=pass, applicability=pass e evidenceConsistent=pass), de modo que esses achados se apoiam em inspecao direta do DOM, do CSS computado e da operacao por teclado, e nao em confirmacao mecanica; nao foi possivel exercitar o envio real de arquivo no input de upload; nao foram avaliados outros viewports alem de 1280x900."
}
````

### Decisão

````json
{
  "cardId": "C-5d1f3f75950edaef62e89b010ad9dfc4fadadbbcc0ee93a6e7b0f4d9789823c0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-5d921a52f61cd76a1c708a65551541e45b87c41724379bfc19f712211a00b2a9

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(1)>span:nth-of-type(2)>button" — <button> · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) > button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-5d921a52f61cd76a1c708a65551541e45b87c41724379bfc19f712211a00b2a9",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-68fa075a63b2e576c9ce640022c1496ee2cf8e34f3d1aa3c3bb0bdd598458a80

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O único controle visível e acionável do campo Documentos comprobatórios é o botão Selecione o arquivo, que tem aria-hidden=true, enquanto o input file #documentos está com display none. Não há, portanto, nenhum componente correspondente na árvore de acessibilidade, embora o botão receba foco pelo teclado e abra o seletor de arquivos ao receber Enter.

Esperado: O controle que aciona o envio de arquivo deve estar exposto à tecnologia assistiva com nome e papel: remover aria-hidden do botão ou tornar o input file perceptível em vez de display none.

Janela: 1280×900 · interações desde o carregamento: 1. carregar a página 2. pressionar Tab uma vez 3. pressionar Enter no botão Selecione o arquivo

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate: atributos do .upload-button iguais a class upload-button, type button, aria-hidden true, tabindex 1` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: getComputedStyle de #documentos com display none e caixa de 0 por 0` → identificador devolvido por ferramenta (sem arquivo)
- `browser_press_key Enter: o servidor passou a reportar Modal state [File chooser], confirmando que o botão aciona o input oculto` → identificador devolvido por ferramenta (sem arquivo)
- `janela auxiliar p2: UP:11true e DOC:1none` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "relatedSelectors": [
      "#documentos"
    ],
    "rule": "wcag:4.1.2",
    "observed": "O único controle visível e acionável do campo Documentos comprobatórios é o botão Selecione o arquivo, que tem aria-hidden=true, enquanto o input file #documentos está com display none. Não há, portanto, nenhum componente correspondente na árvore de acessibilidade, embora o botão receba foco pelo teclado e abra o seletor de arquivos ao receber Enter.",
    "expected": "O controle que aciona o envio de arquivo deve estar exposto à tecnologia assistiva com nome e papel: remover aria-hidden do botão ou tornar o input file perceptível em vez de display none.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar a página",
        "pressionar Tab uma vez",
        "pressionar Enter no botão Selecione o arquivo"
      ]
    },
    "evidence": [
      "browser_evaluate: atributos do .upload-button iguais a class upload-button, type button, aria-hidden true, tabindex 1",
      "browser_evaluate: getComputedStyle de #documentos com display none e caixa de 0 por 0",
      "browser_press_key Enter: o servidor passou a reportar Modal state [File chooser], confirmando que o botão aciona o input oculto",
      "janela auxiliar p2: UP:11true e DOC:1none"
    ]
  },
  "scope": [
    "tela inteira: barra superior, trilha de navegação, formulário Solicitar serviço e região Solicitações anteriores"
  ],
  "notes": "Execução sem oráculo de regras: nenhuma ferramenta de consulta de regras ou de varredura estava disponível, portanto as atribuições wcag: são próprias e justificadas em cada achado, e um achado fica com rule null por atribuição normativa incerta. Interações feitas: carregamento e snapshot da árvore de acessibilidade; leitura de DOM, atributos e estilos computados; Tab a partir do início do documento; Enter no botão de upload, que abriu o seletor de arquivos; envio do formulário vazio pelo botão Enviar, que produziu 8 mensagens de erro e moveu o foco para o alerta de resumo; Enter no controle Fechar a mensagem, que fecha corretamente, sem achado; abertura da lista do combobox Tipo de serviço, com aria-expanded passando a true no wrapper e no gatilho, sem achado; clique no link da página 2 da paginação, que troca o conteúdo da tabela; tentativas de abrir o calendário por foco e por clique no campo Data preferencial. Contraste calculado para os principais pares de texto e fundo (rótulos, textos de apoio, mensagens, botões, trilha, tabela e paginação): menor valor 4.60 na mensagem de erro de campo, todos acima de 4.5, sem achado. Limitação: depois do teste do upload o seletor de arquivos nativo ficou pendente e o servidor MCP passou a recusar browser_click, browser_type, browser_press_key, browser_evaluate, browser_resize e o conteúdo de browser_snapshot, sem ferramenta disponível para encerrar esse estado. As verificações seguintes foram feitas por URLs javascript: com leitura pelo título de uma janela auxiliar, ou seja, com eventos sintéticos no lugar de mouse e teclado reais e sem novo snapshot da árvore de acessibilidade. O comportamento do calendário e da paginação foi observado por script; as demais evidências vêm de leitura direta de DOM e de estilos computados, que independe do tipo de evento."
}
````

### Decisão

````json
{
  "cardId": "C-68fa075a63b2e576c9ce640022c1496ee2cf8e34f3d1aa3c3bb0bdd598458a80",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6a1210ec961ecf56f364f8d795441fc00a72ff431fc5e8f3c4751b4710f9dda8

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Com o calendario aberto, o botao de mes anterior fica visivel (inline-flex, 32x32 px) e contem apenas <i class="fas fa-chevron-left">, sem texto, sem aria-label e sem title: o nome acessivel e vazio.

Esperado: aria-label descritivo no botao, por exemplo aria-label="Mes anterior", como nos demais botoes circulares icon-only da pagina (#data-preferencial-btn, setas da paginacao).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar no botao de calendario #data-preferencial-btn para abrir o flatpickr

Regra declarada: emag-2.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(1)>span:nth-of-type(1)>button" — <button> · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan S-page-001 finding F-008 (emag-2.2, serious)` → identificador devolvido por ferramenta (sem arquivo)
- `scan S-page-002 finding F-020` → identificador devolvido por ferramenta (sem arquivo)
- `DOM com calendario aberto: textContent='', aria-label=null, title='', 32x32 px` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".flatpickr-prev-month button",
    "rule": "emag-2.2",
    "observed": "Com o calendario aberto, o botao de mes anterior fica visivel (inline-flex, 32x32 px) e contem apenas <i class=\"fas fa-chevron-left\">, sem texto, sem aria-label e sem title: o nome acessivel e vazio.",
    "expected": "aria-label descritivo no botao, por exemplo aria-label=\"Mes anterior\", como nos demais botoes circulares icon-only da pagina (#data-preferencial-btn, setas da paginacao).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar no botao de calendario #data-preferencial-btn para abrir o flatpickr"
      ]
    },
    "evidence": [
      "scan S-page-001 finding F-008 (emag-2.2, serious)",
      "scan S-page-002 finding F-020",
      "DOM com calendario aberto: textContent='', aria-label=null, title='', 32x32 px"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao, secao Solicitacoes anteriores (tabela + paginacao)",
    "estados: carga inicial, erro de validacao apos Enviar vazio, envio bem-sucedido, lista do br-select aberta, calendario do br-datetimepicker aberto"
  ],
  "notes": "Interacoes realizadas: carga inicial em 1280x900; snapshot da arvore de acessibilidade; tabulacao a partir de pagina recem-carregada (primeiro Tab); clique em Enviar com formulario vazio; foco e acionamento do botao de fechar da mensagem de erro com Enter e com Space (ambos funcionam e removem a mensagem); abertura da lista de #servico e de #unidade por ArrowDown e selecao por Enter (aria-expanded alterna corretamente e o foco vai para o primeiro br-item); Enter dentro de #servico dispara submissao implicita do formulario (comportamento nativo, nao tratado como defeito); preenchimento completo e envio bem-sucedido (mensagem br-message success, aria-invalid limpos, foco movido para .content[role=alert]); abertura do calendario pelo botao #data-preferencial-btn e inspecao dos controles de mes; leitura de CSS computado e de regras de origem para distinguir folha do @govbr-ds/core da folha da aplicacao. Varreduras do oraculo: S-page-001 (estado inicial, fingerprint sha256:fec51e82...) e S-page-002 (estado de erro, fingerprint sha256:d5b6611b...). Candidatos rejeitados e por que: (a) as 6 deteccoes ds-token-spacing/ds-token-radius (#descricao 6px, #servico e #unidade padding 29px, .br-list margin -2px, select do flatpickr) foram rejeitadas - verify_finding V-001 devolveu verdict=rejected, applicability=fail, 'verificacao deterministica sem norma nomeada nao produz achado' (D-27), e a inspecao de origem mostrou que todos esses valores vem da folha do proprio @govbr-ds/core (jsx-runtime-B-RTDNcS.css), nao da aplicacao; (b) ds-structure-button-tag no <a class='br-button circle'> do breadcrumb e no <div class='br-button' role='button'> do fechar da mensagem de erro - rejeitado por V-003 pelo mesmo motivo de ausencia de norma nomeada, e no caso do breadcrumb o exemplo canonico breadcrumb-default do proprio DS usa exatamente <a class='br-button circle'>; o div com role=button tem nome acessivel e responde a Enter e a Space, entao nao restou violacao normativa a citar; (c) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - coincide com os exemplos canonicos datetimepicker-simple/range/time do DS, rejeitado; (d) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos pagination-default/sizes/ellipsis tambem usam apenas a classe active e o oraculo nao expoe regra para isso: classificado como incerto e nao reportado; (e) ausencia de <ul>/<li> envolvendo os itens da paginacao e classes fora do vocabulario canonico (trilha-servico, acao-enviar, tabela-anteriores etc.) - o proprio oraculo as trata como observacao sem norma; (f) #servico mantem aria-invalid='true' e a mensagem de erro depois de a opcao ser escolhida (a limpeza so ocorre em nova submissao) - nao encontrei norma que exija revalidacao imediata, fica como incerto; (g) apos fechar a mensagem de erro o foco volta para <body> - incerto, nao reportado. Limitacoes: axe-core 4.12.1 rodou com 0 resultados incomplete e nenhuma violacao de contraste; emag-6.2, emag-6.3 e emag-2.2 nao tem predicado mecanico no oraculo (verify_finding V-002 e V-004 devolveram 'no-predicate' com ruleExists=pass, applicability=pass e evidenceConsistent=pass), de modo que esses achados se apoiam em inspecao direta do DOM, do CSS computado e da operacao por teclado, e nao em confirmacao mecanica; nao foi possivel exercitar o envio real de arquivo no input de upload; nao foram avaliados outros viewports alem de 1280x900."
}
````

### Decisão

````json
{
  "cardId": "C-6a1210ec961ecf56f364f8d795441fc00a72ff431fc5e8f3c4751b4710f9dda8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6bb9202c3eae215e9381e4a240860d829455f799d234031a41441e7b5ce77f27

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Após envio inválido, #servico recebe aria-invalid="true" mas aria-describedby é null; a mensagem <span class="feedback danger retorno-campo" role="alert">Selecione o tipo de serviço.</span> não tem id e não é referenciada pelo campo. Nos demais campos a associação existe (#nome → nome-retorno, #cpf → "cpf-apoio cpf-retorno", #data-preferencial → "data-apoio data-retorno", #descricao → "descricao-apoio descricao-retorno", rádios → forma-retorno).

Esperado: A mensagem de erro do campo deve ser programaticamente associada ao controle inválido (id na mensagem e aria-describedby no input), como nos outros campos do mesmo formulário.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em Enviar com o formulário vazio

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(1)>div>div:nth-of-type(1)>div>input" — <input#servico> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-a10dcb076ad236543b32667bd7e0adfec72fef26085a4924a9eb55ecf74492e3 — A-08 · apos-envio-vazio · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4c4e6005ce86b914ed8b58011b3f8effcee1326c119327ddd4eb9e9e0540a41 — A-04 · sempre · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T03-16-27-242Z.yml (estado de erro)` → não encontrado na evidência preservada da execução
- `browser_evaluate: {id:"servico", invalid:"true", desc:null} e span de erro sem atributo id` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#servico",
    "relatedSelectors": [
      ".campo-servico .br-select .feedback.retorno-campo"
    ],
    "rule": "wcag:1.3.1",
    "observed": "Após envio inválido, #servico recebe aria-invalid=\"true\" mas aria-describedby é null; a mensagem <span class=\"feedback danger retorno-campo\" role=\"alert\">Selecione o tipo de serviço.</span> não tem id e não é referenciada pelo campo. Nos demais campos a associação existe (#nome → nome-retorno, #cpf → \"cpf-apoio cpf-retorno\", #data-preferencial → \"data-apoio data-retorno\", #descricao → \"descricao-apoio descricao-retorno\", rádios → forma-retorno).",
    "expected": "A mensagem de erro do campo deve ser programaticamente associada ao controle inválido (id na mensagem e aria-describedby no input), como nos outros campos do mesmo formulário.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em Enviar com o formulário vazio"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T03-16-27-242Z.yml (estado de erro)",
      "browser_evaluate: {id:\"servico\", invalid:\"true\", desc:null} e span de erro sem atributo id"
    ]
  },
  "scope": [
    "tela inteira /solicitacao.html: skiplink, cabeçalho, breadcrumb, formulário de solicitação (nome, CPF, dois selects br-select, grupo de rádios, datetimepicker, textarea, upload, grupo de checkboxes, declaração, ações), mensagens de retorno de envio, tabela \"Solicitações anteriores\" e paginação"
  ],
  "notes": "Sem oráculo de regras nesta execução: nenhuma ferramenta de consulta de regras, scan_page ou verificação heurística estava disponível; as atribuições usam wcag:<critério> apenas quando justificáveis e rule:null quando não. Interações realizadas: carga inicial e árvore de acessibilidade; Tab a partir do topo (13 paradas registradas por listener de focusin); abertura dos dois selects por mouse e por teclado (ArrowDown/Enter) com verificação de aria-expanded e valor; clique no rótulo \"Presencial\" e seleção do mesmo rádio por Espaço; envio do formulário vazio (mensagem \"Há 8 campo(s) obrigatório(s) sem preenchimento\", foco movido para o role=alert) e inspeção de aria-invalid/aria-describedby de todos os campos; fechamento da mensagem de erro pelo teclado (Enter no div role=button, funcionou); preenchimento completo e envio bem-sucedido; clique em \"Página 2\" da paginação; varredura de contraste de texto calculada em 1280x900 nos estados inicial e de erro (nenhuma reprovação); verificação de reflow em 320x640. Limitações e pontos incertos, não reportados como achados: (a) o papel combobox está no div .br-input e não no input focável (#servico/#unidade não expõem aria-expanded/aria-controls) — padrão do próprio design system, aplicabilidade incerta sem oráculo; (b) após escolher uma opção do select pelo teclado o foco vai para <body> em vez de voltar ao input; (c) o botão do calendário (#data-preferencial-btn) tem aria-hidden=\"true\" e tabindex=\"-1\", ficando indisponível a teclado e a leitores de tela, embora a data possa ser digitada; (d) em 320x640 a página rola horizontalmente (scrollWidth 545 vs clientWidth 305) por causa da tabela de solicitações anteriores, caso possivelmente coberto pela exceção de tabelas de dados do reflow; (e) a data \"30/02/2026\" digitada foi normalizada silenciosamente para \"02/03/2026\"; (f) a solicitação enviada com sucesso não passa a constar na tabela \"Solicitações anteriores\"; (g) o diálogo de seleção de arquivo não pôde ser exercido; (h) único erro de console é 404 de /favicon.ico. Todos os seletores enviados foram executados com document.querySelectorAll na página e resolvem para exatamente 1 elemento."
}
````

### Decisão

````json
{
  "cardId": "C-6bb9202c3eae215e9381e4a240860d829455f799d234031a41441e7b5ce77f27",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-6bbb2992254d437eab80b7efbbf0a4d34c2b113958975d0c8eb1bc13a1dcd42e

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O rótulo da opção é <label>Presencial</label>, sem atributo for, e o input não tem aria-label, aria-labelledby nem title: #forma-presencial fica sem nome acessível. Clicar no texto "Presencial" não marca o rádio (checked permanece false). As outras duas opções do mesmo fieldset têm label[for="forma-video"] e label[for="forma-telefone"].

Esperado: Todo campo de formulário deve ter etiqueta associada programaticamente — <label for="forma-presencial">, aria-label ou aria-labelledby — como nas demais opções do grupo.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar no texto "Presencial" ao lado do rádio

Regra declarada: emag:6.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>fieldset:nth-of-type(1)>div:nth-of-type(1)>input" — <input#forma-presencial>

### Unidades candidatas (não são crédito)

- U-471fd34bfed8d491133fe60cfe6233aa00117fefb796768495ff7598fa7a6a5e — A-09 · sempre · cena 1280x900 · <input#forma-presencial>: Estrato S · variante label-sem-for, na primeira opção do grupo (convenção registrada em tela-a/construcao.md). O <label> de "Presencial" não tem for: o radio fica sem nome acessível e clicar no texto não o marca. As outras duas opções estão associadas.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: for, aria-label, aria-labelledby. Medido: ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `govbr-ds-validator scan_page S-page-001 finding F-011 (axe-core rule 'label', severity critical)` → identificador devolvido por ferramenta (sem arquivo)
- `govbr-ds-validator scan_page S-page-002 findings F-024 e F-023` → identificador devolvido por ferramenta (sem arquivo)
- `playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-02-53-052Z.yml (radio sem nome acessível)` → não encontrado na evidência preservada da execução
- `browser_evaluate: forma-presencial.checked=false, label.getAttribute('for')=null após o clique no texto` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#forma-presencial",
    "relatedSelectors": [
      ".grupo-forma label:not([for])"
    ],
    "rule": "emag:6.2",
    "observed": "O rótulo da opção é <label>Presencial</label>, sem atributo for, e o input não tem aria-label, aria-labelledby nem title: #forma-presencial fica sem nome acessível. Clicar no texto \"Presencial\" não marca o rádio (checked permanece false). As outras duas opções do mesmo fieldset têm label[for=\"forma-video\"] e label[for=\"forma-telefone\"].",
    "expected": "Todo campo de formulário deve ter etiqueta associada programaticamente — <label for=\"forma-presencial\">, aria-label ou aria-labelledby — como nas demais opções do grupo.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar no texto \"Presencial\" ao lado do rádio"
      ]
    },
    "evidence": [
      "govbr-ds-validator scan_page S-page-001 finding F-011 (axe-core rule 'label', severity critical)",
      "govbr-ds-validator scan_page S-page-002 findings F-024 e F-023",
      "playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-02-53-052Z.yml (radio sem nome acessível)",
      "browser_evaluate: forma-presencial.checked=false, label.getAttribute('for')=null após o clique no texto"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-6bbb2992254d437eab80b7efbbf0a4d34c2b113958975d0c8eb1bc13a1dcd42e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-71518f8f9fda0a85bc86440d02394bb27a7db0b9e5efdcbcb91b6cd2990feb95

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: br-button aplicado a <div>

Esperado: Elemento <button>

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:structure-button-tag

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(1)>div>div:nth-of-type(1)>div" — <div> "Fechar a mensagem"

### Unidades candidatas (não são crédito)

- U-bbfc7654327714d26fe1c4acef5b74dd3a8b5e541d8cd630d6ebc6f9d63f8fc0 — A-06 · apos-envio-vazio · cena 1280x900 · <div> "Fechar a mensagem": Estrato E · variante nativo-para-div. O botão Fechar da mensagem de retorno é um <div role="button" tabindex="0"> com tratadores de Enter e Espaço, no lugar do <button> nativo do exemplo oficial. Continua operável por teclado e nomeado — o defeito é só o elemento.
  - estados em que a unidade existe: apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: classe-no-elemento sustenta em apos-envio-vazio, dialogo-aberto — o próprio <div> carrega a classe .br-button. Medido: <div class="br-button circle small"> | <div class="br-button circle small">
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#main-content > form > div:nth-of-type(1) > div > div:nth-of-type(1) > div",
    "rule": "ds:structure-button-tag",
    "observed": "br-button aplicado a <div>",
    "expected": "Elemento <button>",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-71518f8f9fda0a85bc86440d02394bb27a7db0b9e5efdcbcb91b6cd2990feb95",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-71b3956f3acaa24e774685d602d021967e0c1e983e885c2fc317d180f0ec2e94

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A página corrente da paginação do histórico é sinalizada apenas pela classe 'active' e pelo contraste visual (texto branco sobre rgb(12,50,111), contra azul sobre fundo claro nas demais). O link não tem aria-current e seu aria-label é apenas 'Página 1'. Após clicar em 'Página 2' as linhas da tabela mudam e a classe 'active' migra para o segundo link, mas o único elemento com aria-current na página continua sendo o span do breadcrumb ('Solicitar serviço'), ou seja, a paginação nunca expõe a página atual programaticamente.

Esperado: O link da página corrente deve expor esse estado de forma programática, com aria-current="page", acompanhando a mudança ao navegar entre páginas — como já é feito no item atual do breadcrumb da mesma tela.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. ler o HTML de .br-pagination 3. clicar no link 'Página 2' 4. reler .br-pagination e listar todos os elementos com aria-current

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>section>div>div:nth-of-type(2)>nav>a:nth-of-type(1)" — <a> "Página 1"

### Unidades candidatas (não são crédito)

- U-6b2335b7d8c3ff70b8ef3ca3533d672b6a1a6611d3db662a510e1380f65145a5 — A-07 · sempre · cena 1280x900 · <nav> "Paginação de solicitações anteriores": Estrato E · variante links-fora-de-lista. Os links de página são âncoras adjacentes soltas dentro do <nav>, sem o <ul>/<li> do exemplo oficial: nada além de espaço os separa. Sem predicado na referência (nenhuma espécie mede o elemento pai); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-fa46b3b01953095c45ccd4ee7da378bc7eaab3a1936698faa3f365516a5be29e — A-12 · sempre · cena 1280x900 · <nav> "Paginação de solicitações anteriores": Estrato S · variante aria-removido. A página ativa da paginação é marcada só pela classe `active`: nenhum link carrega aria-current="page", o estado que o próprio DS escreve em tempo de execução. A trilha de navegação da mesma tela marca a página atual com aria-current.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-current. Medido: ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate: paginationHTML com '<a class="page active" aria-label="Página 1" href="#titulo-historico">1</a>' sem aria-current` → não encontrado na evidência preservada da execução
- `browser_evaluate após clicar em Página 2: data-current=2, classe active em '2', ariaCurrentAnywhere=[{tag:SPAN, val:'page', txt:'Solicitar serviço'}]` → identificador devolvido por ferramenta (sem arquivo)
- `.playwright-mcp/page-2026-09-19T02-51-29-554Z.yml` → `pipeline/logs/2026-09-18T23-14-46-sem-run2-a967f5af-evidencia/.playwright-mcp/page-2026-09-19T02-51-29-554Z.yml` (sha256 827afcd1642f)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".br-pagination a.page.active",
    "rule": "wcag:1.3.1",
    "observed": "A página corrente da paginação do histórico é sinalizada apenas pela classe 'active' e pelo contraste visual (texto branco sobre rgb(12,50,111), contra azul sobre fundo claro nas demais). O link não tem aria-current e seu aria-label é apenas 'Página 1'. Após clicar em 'Página 2' as linhas da tabela mudam e a classe 'active' migra para o segundo link, mas o único elemento com aria-current na página continua sendo o span do breadcrumb ('Solicitar serviço'), ou seja, a paginação nunca expõe a página atual programaticamente.",
    "expected": "O link da página corrente deve expor esse estado de forma programática, com aria-current=\"page\", acompanhando a mudança ao navegar entre páginas — como já é feito no item atual do breadcrumb da mesma tela.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "ler o HTML de .br-pagination",
        "clicar no link 'Página 2'",
        "reler .br-pagination e listar todos os elementos com aria-current"
      ]
    },
    "evidence": [
      "browser_evaluate: paginationHTML com '<a class=\"page active\" aria-label=\"Página 1\" href=\"#titulo-historico\">1</a>' sem aria-current",
      "browser_evaluate após clicar em Página 2: data-current=2, classe active em '2', ariaCurrentAnywhere=[{tag:SPAN, val:'page', txt:'Solicitar serviço'}]",
      ".playwright-mcp/page-2026-09-19T02-51-29-554Z.yml"
    ]
  },
  "scope": [
    "solicitacao.html — tela inteira: skiplink, cabeçalho gov.br, breadcrumb, formulário de solicitação (nome, CPF, tipo de serviço, unidade, forma de atendimento, data preferencial, descrição, documentos, recursos de acessibilidade, declaração, ações) e seção 'Solicitações anteriores' com tabela e paginação",
    "estados observados: carga inicial; combobox aberto; formulário submetido vazio (erros); formulário submetido válido (sucesso); paginação na página 2; viewport 320x800"
  ],
  "notes": "Ferramentas usadas: navegação, snapshot da árvore de acessibilidade, avaliação de DOM/CSS computado, teclado e mouse. Interações executadas: Tab a partir do início do documento para verificar ordem de foco; abertura e fechamento dos dois comboboxes por clique e por teclado (ArrowDown/Enter); seleção de opções; clique no rótulo 'Presencial' e no input correspondente; navegação por ArrowUp dentro do grupo de rádio; preenchimento de nome, CPF, data e descrição; submissão com campos vazios e verificação das mensagens de erro, de aria-invalid, de aria-describedby e do destino do foco; fechamento da mensagem de erro por Enter no controle 'Fechar a mensagem' (funcionou); submissão válida completa e verificação da mensagem de sucesso (role=alert, foco movido, aria-invalid limpo); clique em 'Página 2' da paginação; redimensionamento para 320x800 e medição de transbordo. Contraste verificado por cálculo de razão em 23 combinações de texto e fundo (rótulos, textos de apoio, mensagens, botões, breadcrumb, paginação, tabela, skiplink): todas passaram em AA, nenhum achado de contraste. Indicadores de foco verificados em 16 controles. Limitações: nenhum oráculo de regras nem ferramenta scan_page/verificação heurística estava disponível nesta execução, portanto não há identificadores de regra devolvidos por ferramenta; as atribuições usam critérios WCAG que consigo justificar pela observação, e os candidatos que não consegui atribuir com segurança foram deixados fora dos achados e estão declarados aqui como incertos. Incertos (observados, não reportados como achado por atribuição normativa insegura ou por serem possivelmente o comportamento padrão do Design System gov.br, não um defeito da tela): (1) o skiplink usa nav[role=menubar] com a[role=menuitem] para um único link de atalho, o que faz leitores de tela anunciarem barra de menus em vez de link; (2) role=combobox está no wrapper div.br-input, que não é focalizável, enquanto o elemento que recebe foco (#servico/#unidade) é exposto como textbox simples, sem aria-expanded — o estado de expansão existe mas fica no wrapper; as opções em role=option não têm aria-selected; (3) o span do item atual do breadcrumb tem tabindex=0, criando uma parada de foco sem ação; (4) a troca de página da tabela não é anunciada (o conteúdo muda sem região viva e o foco permanece no link). O erro 404 de /favicon.ico no console é irrelevante para conformidade. Um único achado usa seletor com dois elementos (#servico, #unidade) porque a mesma regra CSS produz a mesma afirmação para ambos."
}
````

### Decisão

````json
{
  "cardId": "C-71b3956f3acaa24e774685d602d021967e0c1e983e885c2fc317d180f0ec2e94",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-72b78f660ad34c2de04b83ed5b37e5ee5b459b3909b761e5e154f52a973f8cf9

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Após enviar o formulário vazio, o campo Unidade de atendimento recebe aria-invalid=true e a mensagem Selecione a unidade de atendimento é inserida ao lado dele, mas o span da mensagem não tem id e o input não tem aria-describedby, ao contrário dos campos Nome completo, CPF, Data preferencial, Descrição e da declaração, que usam aria-describedby.

Esperado: A mensagem de erro deve estar programaticamente associada ao campo, por exemplo com id no span e aria-describedby no input, como nos demais campos.

Janela: 1280×900 · interações desde o carregamento: 1. carregar a página 2. acionar o botão Enviar com o formulário vazio

Regra declarada: wcag:3.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `janela auxiliar p2: U:true,null,FBID:EMPTY` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: lista de .feedback mostra as duas únicas mensagens sem id, nas caixas br-input danger de serviço e unidade` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#unidade",
    "relatedSelectors": [
      ".campo-unidade .feedback"
    ],
    "rule": "wcag:3.3.1",
    "observed": "Após enviar o formulário vazio, o campo Unidade de atendimento recebe aria-invalid=true e a mensagem Selecione a unidade de atendimento é inserida ao lado dele, mas o span da mensagem não tem id e o input não tem aria-describedby, ao contrário dos campos Nome completo, CPF, Data preferencial, Descrição e da declaração, que usam aria-describedby.",
    "expected": "A mensagem de erro deve estar programaticamente associada ao campo, por exemplo com id no span e aria-describedby no input, como nos demais campos.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar a página",
        "acionar o botão Enviar com o formulário vazio"
      ]
    },
    "evidence": [
      "janela auxiliar p2: U:true,null,FBID:EMPTY",
      "browser_evaluate: lista de .feedback mostra as duas únicas mensagens sem id, nas caixas br-input danger de serviço e unidade"
    ]
  },
  "scope": [
    "tela inteira: barra superior, trilha de navegação, formulário Solicitar serviço e região Solicitações anteriores"
  ],
  "notes": "Execução sem oráculo de regras: nenhuma ferramenta de consulta de regras ou de varredura estava disponível, portanto as atribuições wcag: são próprias e justificadas em cada achado, e um achado fica com rule null por atribuição normativa incerta. Interações feitas: carregamento e snapshot da árvore de acessibilidade; leitura de DOM, atributos e estilos computados; Tab a partir do início do documento; Enter no botão de upload, que abriu o seletor de arquivos; envio do formulário vazio pelo botão Enviar, que produziu 8 mensagens de erro e moveu o foco para o alerta de resumo; Enter no controle Fechar a mensagem, que fecha corretamente, sem achado; abertura da lista do combobox Tipo de serviço, com aria-expanded passando a true no wrapper e no gatilho, sem achado; clique no link da página 2 da paginação, que troca o conteúdo da tabela; tentativas de abrir o calendário por foco e por clique no campo Data preferencial. Contraste calculado para os principais pares de texto e fundo (rótulos, textos de apoio, mensagens, botões, trilha, tabela e paginação): menor valor 4.60 na mensagem de erro de campo, todos acima de 4.5, sem achado. Limitação: depois do teste do upload o seletor de arquivos nativo ficou pendente e o servidor MCP passou a recusar browser_click, browser_type, browser_press_key, browser_evaluate, browser_resize e o conteúdo de browser_snapshot, sem ferramenta disponível para encerrar esse estado. As verificações seguintes foram feitas por URLs javascript: com leitura pelo título de uma janela auxiliar, ou seja, com eventos sintéticos no lugar de mouse e teclado reais e sem novo snapshot da árvore de acessibilidade. O comportamento do calendário e da paginação foi observado por script; as demais evidências vêm de leitura direta de DOM e de estilos computados, que independe do tipo de evento."
}
````

### Decisão

````json
{
  "cardId": "C-72b78f660ad34c2de04b83ed5b37e5ee5b459b3909b761e5e154f52a973f8cf9",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7ef093938c51a6f70a0251af6e6630969dc112a9481e19ab582535a7750a5ba0

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O rádio da opção Presencial não tem nome acessível: o texto visível está em um label sem atributo for, que também não envolve o campo, e o input não tem aria-label nem aria-labelledby, de modo que input.labels.length é 0. No snapshot da árvore de acessibilidade ele aparece como radio sem nome, ao lado de radio Por videochamada e radio Por telefone, cujos labels usam for.

Esperado: O rádio deve expor como nome acessível o texto visível Presencial, por label com for=forma-presencial, por label envolvente ou por aria-label.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>fieldset:nth-of-type(1)>div:nth-of-type(1)>input" — <input#forma-presencial>

### Unidades candidatas (não são crédito)

- U-471fd34bfed8d491133fe60cfe6233aa00117fefb796768495ff7598fa7a6a5e — A-09 · sempre · cena 1280x900 · <input#forma-presencial>: Estrato S · variante label-sem-for, na primeira opção do grupo (convenção registrada em tela-a/construcao.md). O <label> de "Presencial" não tem for: o radio fica sem nome acessível e clicar no texto não o marca. As outras duas opções estão associadas.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: for, aria-label, aria-labelledby. Medido: ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T02-25-53-574Z.yml: radio [ref=e56] sem nome dentro do grupo Forma de atendimento` → não encontrado na evidência preservada da execução
- `browser_evaluate sobre .grupo-forma: label sem atributo for imediatamente após input id=forma-presencial` → identificador devolvido por ferramenta (sem arquivo)
- `janela auxiliar p2: BAD[I:forma-presencial] e FP:10, isto é, 1 elemento e 0 labels` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#forma-presencial",
    "relatedSelectors": [
      ".grupo-forma .br-radio:first-of-type label"
    ],
    "rule": "wcag:4.1.2",
    "observed": "O rádio da opção Presencial não tem nome acessível: o texto visível está em um label sem atributo for, que também não envolve o campo, e o input não tem aria-label nem aria-labelledby, de modo que input.labels.length é 0. No snapshot da árvore de acessibilidade ele aparece como radio sem nome, ao lado de radio Por videochamada e radio Por telefone, cujos labels usam for.",
    "expected": "O rádio deve expor como nome acessível o texto visível Presencial, por label com for=forma-presencial, por label envolvente ou por aria-label.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T02-25-53-574Z.yml: radio [ref=e56] sem nome dentro do grupo Forma de atendimento",
      "browser_evaluate sobre .grupo-forma: label sem atributo for imediatamente após input id=forma-presencial",
      "janela auxiliar p2: BAD[I:forma-presencial] e FP:10, isto é, 1 elemento e 0 labels"
    ]
  },
  "scope": [
    "tela inteira: barra superior, trilha de navegação, formulário Solicitar serviço e região Solicitações anteriores"
  ],
  "notes": "Execução sem oráculo de regras: nenhuma ferramenta de consulta de regras ou de varredura estava disponível, portanto as atribuições wcag: são próprias e justificadas em cada achado, e um achado fica com rule null por atribuição normativa incerta. Interações feitas: carregamento e snapshot da árvore de acessibilidade; leitura de DOM, atributos e estilos computados; Tab a partir do início do documento; Enter no botão de upload, que abriu o seletor de arquivos; envio do formulário vazio pelo botão Enviar, que produziu 8 mensagens de erro e moveu o foco para o alerta de resumo; Enter no controle Fechar a mensagem, que fecha corretamente, sem achado; abertura da lista do combobox Tipo de serviço, com aria-expanded passando a true no wrapper e no gatilho, sem achado; clique no link da página 2 da paginação, que troca o conteúdo da tabela; tentativas de abrir o calendário por foco e por clique no campo Data preferencial. Contraste calculado para os principais pares de texto e fundo (rótulos, textos de apoio, mensagens, botões, trilha, tabela e paginação): menor valor 4.60 na mensagem de erro de campo, todos acima de 4.5, sem achado. Limitação: depois do teste do upload o seletor de arquivos nativo ficou pendente e o servidor MCP passou a recusar browser_click, browser_type, browser_press_key, browser_evaluate, browser_resize e o conteúdo de browser_snapshot, sem ferramenta disponível para encerrar esse estado. As verificações seguintes foram feitas por URLs javascript: com leitura pelo título de uma janela auxiliar, ou seja, com eventos sintéticos no lugar de mouse e teclado reais e sem novo snapshot da árvore de acessibilidade. O comportamento do calendário e da paginação foi observado por script; as demais evidências vêm de leitura direta de DOM e de estilos computados, que independe do tipo de evento."
}
````

### Decisão

````json
{
  "cardId": "C-7ef093938c51a6f70a0251af6e6630969dc112a9481e19ab582535a7750a5ba0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7f837090ed356d8d782df92ee5a18441cdd7d374211446f3f3674e100f0ae0b9

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Após enviar o formulário vazio, #unidade recebe aria-invalid="true" e é inserido <span class="feedback danger retorno-campo" role="alert">Selecione a unidade de atendimento.</span>, mas esse span não tem id e #unidade permanece com aria-describedby=null.

Esperado: A mensagem de erro deve ser vinculada ao campo em erro por aria-describedby, como nos demais campos do mesmo formulário.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em Enviar com o formulário vazio

Regra declarada: emag:6.6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate no estado de erro: #unidade aria-describedby=null e .campo-unidade .retorno-campo resolve 1 span sem id` → identificador devolvido por ferramenta (sem arquivo)
- `playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-11-10-864Z.yml` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#unidade",
    "relatedSelectors": [
      ".campo-unidade .retorno-campo"
    ],
    "rule": "emag:6.6",
    "observed": "Após enviar o formulário vazio, #unidade recebe aria-invalid=\"true\" e é inserido <span class=\"feedback danger retorno-campo\" role=\"alert\">Selecione a unidade de atendimento.</span>, mas esse span não tem id e #unidade permanece com aria-describedby=null.",
    "expected": "A mensagem de erro deve ser vinculada ao campo em erro por aria-describedby, como nos demais campos do mesmo formulário.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em Enviar com o formulário vazio"
      ]
    },
    "evidence": [
      "browser_evaluate no estado de erro: #unidade aria-describedby=null e .campo-unidade .retorno-campo resolve 1 span sem id",
      "playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-11-10-864Z.yml"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-7f837090ed356d8d782df92ee5a18441cdd7d374211446f3f3674e100f0ae0b9",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8826711d636da9d79d16e148899b8d03ce23b6da99ef0a89bd82adeb27f6dfa8

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: margin: -2px 0px 0px (fora da escala: -2px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:#list-3046" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#list-3046",
    "rule": "ds:token-spacing",
    "observed": "margin: -2px 0px 0px (fora da escala: -2px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-8826711d636da9d79d16e148899b8d03ce23b6da99ef0a89bd82adeb27f6dfa8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8ae96ec4770459aa94a2f693214380325adf7886f90e7b7dce05e1b2877cd847

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Com o calendario aberto, o botao de mes anterior e focalizavel (tabindex padrao de <button>, fora de qualquer aria-hidden) e contem apenas o icone <i class="fas fas fa-chevron-left">, sem aria-label e sem texto: nome acessivel vazio.

Esperado: Controle interativo apenas com icone precisa de nome acessivel, por exemplo aria-label="Mes anterior".

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em #data-preferencial-btn para abrir o calendario

Regra declarada: emag:2.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(1)>span:nth-of-type(1)>button" — <button> · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan_page S-page-001 finding F-008 (emag-2.2, serious, 'Elemento interativo apenas com icone, sem aria-label (br-button)')` → identificador devolvido por ferramenta (sem arquivo)
- `scan_page S-page-002 finding F-020 (mesma regra)` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate no estado de calendario aberto: {tag:'BUTTON', cls:'br-button circle small', tabindex:null, label:null, text:'', ariaHidden:false}` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: outerHTML de .flatpickr-prev-month = '<span class="flatpickr-prev-month"><button class="br-button circle small" type="button"><i class="fas fas fa-chevron-left"></i></button></span>'` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": ".flatpickr-prev-month > button",
    "relatedSelectors": [
      "#data-preferencial-btn"
    ],
    "rule": "emag:2.2",
    "observed": "Com o calendario aberto, o botao de mes anterior e focalizavel (tabindex padrao de <button>, fora de qualquer aria-hidden) e contem apenas o icone <i class=\"fas fas fa-chevron-left\">, sem aria-label e sem texto: nome acessivel vazio.",
    "expected": "Controle interativo apenas com icone precisa de nome acessivel, por exemplo aria-label=\"Mes anterior\".",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em #data-preferencial-btn para abrir o calendario"
      ]
    },
    "evidence": [
      "scan_page S-page-001 finding F-008 (emag-2.2, serious, 'Elemento interativo apenas com icone, sem aria-label (br-button)')",
      "scan_page S-page-002 finding F-020 (mesma regra)",
      "browser_evaluate no estado de calendario aberto: {tag:'BUTTON', cls:'br-button circle small', tabindex:null, label:null, text:'', ariaHidden:false}",
      "browser_evaluate: outerHTML de .flatpickr-prev-month = '<span class=\"flatpickr-prev-month\"><button class=\"br-button circle small\" type=\"button\"><i class=\"fas fas fa-chevron-left\"></i></button></span>'"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao (nome, CPF, dois br-select, grupo de radio, datetimepicker, textarea, upload, checkboxes, declaracao, acoes), mensagem de retorno de validacao, tabela de solicitacoes anteriores e paginacao"
  ],
  "notes": "Viewport 1280x900. Interacoes executadas: submissao do formulario vazio via .acao-enviar (mensagem br-message danger + feedbacks por campo + aria-invalid + foco movido para .content[role=alert][tabindex=-1]); fechamento da mensagem pelo controle .close com Enter via teclado (funcionou, mensagem removida); abertura/fechamento do br-select 'Tipo de servico' por clique no botao data-trigger e por ArrowDown com foco no input (aria-expanded alterna corretamente em ambos); foco/clique em #data-preferencial (NAO abre o calendario) e clique em #data-preferencial-btn (abre); inspecao da arvore do calendario aberto; Tab unico a partir do carregamento (foco caiu em .upload-button, nao no skiplink); clique em 'Pagina 2' da paginacao (as linhas da tabela mudam e data-current vai para 2, funcional). Varreduras do oraculo: S-page-001 (estado inicial) e S-page-002 (apos clique em .acao-enviar, comparada por compareToScanId). CANDIDATOS REJEITADOS, com motivo: (a) ds-structure-button-tag sobre o <a class='br-button circle'> do breadcrumb - o exemplo canonico breadcrumb-default usa exatamente <a class='br-button circle'>, entao a marcacao esta conforme; (b) ds-structure-button-tag sobre o <div class='br-button' role='button'> do fechar-mensagem - diverge do exemplo canonico message-padrao, que usa <button>, e seria um achado plausivel, mas verify_finding rejeitou o id (D-27: 'ds-structure-button-tag nao declara qual regra normativa implementa'), e o protocolo proibe emprestar o id de outra norma para sustentar exigencia estrutural; alem disso confirmei por teclado que o controle e operavel com Enter; (c) todos os ds-token-spacing e ds-token-radius (padding 29px em #servico/#unidade, margin -2px nas .br-list, border-radius 6px em #descricao, margin do select do flatpickr) - verify_finding rejeitou ds-token-spacing e ds-token-radius pelo mesmo D-27; permanecem como observacoes de revisao, nao como achados, ainda que 6px em #descricao destoe dos 4px dos demais controles; (d) o F-017 do scanner alega escala violada mas reporta 'margin: 0px', valor que esta na escala - evidencia autocontraditoria; (e) label-title-only em #forma-presencial - mesmo defeito ja reportado sob e-MAG 6.2, nao repetido sob outra regra; (f) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - identico aos exemplos canonicos do datetimepicker, e o campo aceita digitacao com instrucao de formato, entao ha alternativa de entrada; (g) <span tabindex='0' aria-current='page'> do breadcrumb - presente literalmente no exemplo canonico; (h) papel combobox no wrapper .br-input e opcoes como radio dentro de .br-list - padrao canonico do br-select, e verifiquei que e operavel por teclado; (i) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos de paginacao tambem nao usam aria-current, sem norma para sustentar; (j) erro de console 404 de /favicon.ico - irrelevante para conformidade. LIMITACOES: avaliei apenas o viewport 1280x900, sem checagem responsiva em larguras menores; nao testei leitor de tela real, apenas a arvore de acessibilidade e atributos ARIA; nao exercitei o upload de arquivo real nem uma submissao valida completa ate o estado de sucesso, entao o estado de sucesso do formulario nao foi avaliado; os ids das .br-list sao gerados aleatoriamente a cada carga, por isso nenhum seletor deste relatorio depende deles; os achados 4, 5 e 6 estao na marcacao do flatpickr embutido no componente datetimepicker, e nao no codigo proprio da tela, mas integram a interface entregue."
}
````

### Decisão

````json
{
  "cardId": "C-8ae96ec4770459aa94a2f693214380325adf7886f90e7b7dce05e1b2877cd847",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8b146cd2e82e72d02f7fd3572bfc6effcf9d6aac38752f95214974f4e5fcda09

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: Elemento interativo apenas com ícone, sem aria-label (br-button)

Esperado: aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: emag:2.2

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(1)>span:nth-of-type(1)>button" — <button> · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(1) > button",
    "rule": "emag:2.2",
    "observed": "Elemento interativo apenas com ícone, sem aria-label (br-button)",
    "expected": "aria-label descritivo (os exemplos oficiais de botão circular sempre trazem aria-label)",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-8b146cd2e82e72d02f7fd3572bfc6effcf9d6aac38752f95214974f4e5fcda09",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8b5627ec3a8eca66332d9233983e13373d679ec0c83632ef8e51970d1a5e4b85

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Com #cpf="123" e todos os demais campos obrigatórios preenchidos, o envio é aceito: .retorno-envio passa a exibir "Solicitação enviada. Acompanhe o andamento em Solicitações anteriores.", #cpf fica com aria-invalid=null e nenhuma .retorno-campo é gerada.

Esperado: O valor deve ser recusado com erro identificado e descrito no campo, já que a orientação associada (#cpf-apoio) declara "Somente números, 11 dígitos."

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. preencher #nome com "Maria da Silva" 3. preencher #cpf com "123" 4. selecionar "Emissão de certidão" em Tipo de serviço 5. selecionar "Agência Centro" em Unidade de atendimento 6. marcar o rádio Presencial 7. preencher Data preferencial com "02/10/2026" 8. preencher Descrição 9. marcar a declaração 10. clicar em Enviar

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(2)>div:nth-of-type(2)>div>input" — <input#cpf> "00000000000"

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate após o envio: .retorno-envio.textContent="Solicitação enviada. Acompanhe o andamento em Solicitações anteriores.", #cpf aria-invalid=null, [...document.querySelectorAll('.retorno-campo')] vazio` → identificador devolvido por ferramenta (sem arquivo)
- `playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-09-03-559Z.yml` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      "#cpf-apoio"
    ],
    "rule": null,
    "observed": "Com #cpf=\"123\" e todos os demais campos obrigatórios preenchidos, o envio é aceito: .retorno-envio passa a exibir \"Solicitação enviada. Acompanhe o andamento em Solicitações anteriores.\", #cpf fica com aria-invalid=null e nenhuma .retorno-campo é gerada.",
    "expected": "O valor deve ser recusado com erro identificado e descrito no campo, já que a orientação associada (#cpf-apoio) declara \"Somente números, 11 dígitos.\"",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "preencher #nome com \"Maria da Silva\"",
        "preencher #cpf com \"123\"",
        "selecionar \"Emissão de certidão\" em Tipo de serviço",
        "selecionar \"Agência Centro\" em Unidade de atendimento",
        "marcar o rádio Presencial",
        "preencher Data preferencial com \"02/10/2026\"",
        "preencher Descrição",
        "marcar a declaração",
        "clicar em Enviar"
      ]
    },
    "evidence": [
      "browser_evaluate após o envio: .retorno-envio.textContent=\"Solicitação enviada. Acompanhe o andamento em Solicitações anteriores.\", #cpf aria-invalid=null, [...document.querySelectorAll('.retorno-campo')] vazio",
      "playwright browser_snapshot .playwright-mcp/page-2026-09-19T03-09-03-559Z.yml"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-8b5627ec3a8eca66332d9233983e13373d679ec0c83632ef8e51970d1a5e4b85",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8c63a309ba0f3edb4563d74621578159a06adadd3dac6be4da142ffc46af44d8

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: margin: 0px (fora da escala: -1px, -1px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(1)>div>div>select" — <select> "Month" · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "div:nth-of-type(2) > div:nth-of-type(1) > div > div > select",
    "rule": "ds:token-spacing",
    "observed": "margin: 0px (fora da escala: -1px, -1px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-8c63a309ba0f3edb4563d74621578159a06adadd3dac6be4da142ffc46af44d8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-939ae3b73752e7f67aae4200a52129f00b4509b8c7068cd174b6c2dd312e4c6b

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Na paginação de Solicitações anteriores, a página corrente é indicada apenas visualmente, pela classe active e pelo fundo azul escuro. Nenhum dos três links tem aria-current: no carregamento o link 1 está com classe active e aria-current nulo e, após acionar o link 2, o conteúdo da tabela muda, a classe active passa para o segundo link e os três continuam com aria-current nulo.

Esperado: O link da página corrente deve expor essa condição programaticamente, com aria-current=page, como já é feito no item atual da trilha de navegação.

Janela: 1280×900 · interações desde o carregamento: 1. carregar a página 2. acionar o link Página 2 da paginação

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>section>div>div:nth-of-type(2)>nav>a:nth-of-type(1)" — <a> "Página 1"

### Unidades candidatas (não são crédito)

- U-6b2335b7d8c3ff70b8ef3ca3533d672b6a1a6611d3db662a510e1380f65145a5 — A-07 · sempre · cena 1280x900 · <nav> "Paginação de solicitações anteriores": Estrato E · variante links-fora-de-lista. Os links de página são âncoras adjacentes soltas dentro do <nav>, sem o <ul>/<li> do exemplo oficial: nada além de espaço os separa. Sem predicado na referência (nenhuma espécie mede o elemento pai); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-fa46b3b01953095c45ccd4ee7da378bc7eaab3a1936698faa3f365516a5be29e — A-12 · sempre · cena 1280x900 · <nav> "Paginação de solicitações anteriores": Estrato S · variante aria-removido. A página ativa da paginação é marcada só pela classe `active`: nenhum link carrega aria-current="page", o estado que o próprio DS escreve em tempo de execução. A trilha de navegação da mesma tela marca a página atual com aria-current.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-current. Medido: ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current | ausentes: aria-current
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `janela auxiliar p2 no carregamento: AC:11null, ou seja, 1 elemento, texto 1 e aria-current nulo` → identificador devolvido por ferramenta (sem arquivo)
- `janela auxiliar p2 após acionar a página 2: NOW:2026.0217.000731/ACT:010/CUR:,,` → não encontrado na evidência preservada da execução
- `.playwright-mcp/page-2026-09-19T02-25-53-574Z.yml: navigation Paginação de solicitações anteriores com links Página 1, Página 2 e Página 3` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "a.page.active",
    "rule": "wcag:1.3.1",
    "observed": "Na paginação de Solicitações anteriores, a página corrente é indicada apenas visualmente, pela classe active e pelo fundo azul escuro. Nenhum dos três links tem aria-current: no carregamento o link 1 está com classe active e aria-current nulo e, após acionar o link 2, o conteúdo da tabela muda, a classe active passa para o segundo link e os três continuam com aria-current nulo.",
    "expected": "O link da página corrente deve expor essa condição programaticamente, com aria-current=page, como já é feito no item atual da trilha de navegação.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar a página",
        "acionar o link Página 2 da paginação"
      ]
    },
    "evidence": [
      "janela auxiliar p2 no carregamento: AC:11null, ou seja, 1 elemento, texto 1 e aria-current nulo",
      "janela auxiliar p2 após acionar a página 2: NOW:2026.0217.000731/ACT:010/CUR:,,",
      ".playwright-mcp/page-2026-09-19T02-25-53-574Z.yml: navigation Paginação de solicitações anteriores com links Página 1, Página 2 e Página 3"
    ]
  },
  "scope": [
    "tela inteira: barra superior, trilha de navegação, formulário Solicitar serviço e região Solicitações anteriores"
  ],
  "notes": "Execução sem oráculo de regras: nenhuma ferramenta de consulta de regras ou de varredura estava disponível, portanto as atribuições wcag: são próprias e justificadas em cada achado, e um achado fica com rule null por atribuição normativa incerta. Interações feitas: carregamento e snapshot da árvore de acessibilidade; leitura de DOM, atributos e estilos computados; Tab a partir do início do documento; Enter no botão de upload, que abriu o seletor de arquivos; envio do formulário vazio pelo botão Enviar, que produziu 8 mensagens de erro e moveu o foco para o alerta de resumo; Enter no controle Fechar a mensagem, que fecha corretamente, sem achado; abertura da lista do combobox Tipo de serviço, com aria-expanded passando a true no wrapper e no gatilho, sem achado; clique no link da página 2 da paginação, que troca o conteúdo da tabela; tentativas de abrir o calendário por foco e por clique no campo Data preferencial. Contraste calculado para os principais pares de texto e fundo (rótulos, textos de apoio, mensagens, botões, trilha, tabela e paginação): menor valor 4.60 na mensagem de erro de campo, todos acima de 4.5, sem achado. Limitação: depois do teste do upload o seletor de arquivos nativo ficou pendente e o servidor MCP passou a recusar browser_click, browser_type, browser_press_key, browser_evaluate, browser_resize e o conteúdo de browser_snapshot, sem ferramenta disponível para encerrar esse estado. As verificações seguintes foram feitas por URLs javascript: com leitura pelo título de uma janela auxiliar, ou seja, com eventos sintéticos no lugar de mouse e teclado reais e sem novo snapshot da árvore de acessibilidade. O comportamento do calendário e da paginação foi observado por script; as demais evidências vêm de leitura direta de DOM e de estilos computados, que independe do tipo de evento."
}
````

### Decisão

````json
{
  "cardId": "C-939ae3b73752e7f67aae4200a52129f00b4509b8c7068cd174b6c2dd312e4c6b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-94a4aaa8f81d74dbe6e03d789c42fdb9f9f2f2bfa10171592291aba31f57faee

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O <label>Presencial</label> irmao nao tem atributo for, e o input nao tem aria-label nem aria-labelledby: o nome acessivel do radio e vazio. Os outros dois radios do mesmo fieldset (#forma-video e #forma-telefone) usam label[for] e sao anunciados corretamente.

Esperado: O radio deve ter rotulo associado programaticamente, por exemplo <label for="forma-presencial">Presencial</label>.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html

Regra declarada: emag-6.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>fieldset:nth-of-type(1)>div:nth-of-type(1)>input" — <input#forma-presencial>

### Unidades candidatas (não são crédito)

- U-471fd34bfed8d491133fe60cfe6233aa00117fefb796768495ff7598fa7a6a5e — A-09 · sempre · cena 1280x900 · <input#forma-presencial>: Estrato S · variante label-sem-for, na primeira opção do grupo (convenção registrada em tela-a/construcao.md). O <label> de "Presencial" não tem for: o radio fica sem nome acessível e clicar no texto não o marca. As outras duas opções estão associadas.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: for, aria-label, aria-labelledby. Medido: ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `scan S-page-001 finding F-011 (axe 'label', critical)` → identificador devolvido por ferramenta (sem arquivo)
- `scan S-page-002 findings F-024 e F-023 (axe 'label' e 'label-title-only')` → identificador devolvido por ferramenta (sem arquivo)
- `verify_finding V-004: ruleExists=pass, applicability=pass, evidenceConsistent=pass` → identificador devolvido por ferramenta (sem arquivo)
- `DOM: outerHTML de fieldset.grupo-forma` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#forma-presencial",
    "relatedSelectors": [
      "#forma-presencial + label"
    ],
    "rule": "emag-6.2",
    "observed": "O <label>Presencial</label> irmao nao tem atributo for, e o input nao tem aria-label nem aria-labelledby: o nome acessivel do radio e vazio. Os outros dois radios do mesmo fieldset (#forma-video e #forma-telefone) usam label[for] e sao anunciados corretamente.",
    "expected": "O radio deve ter rotulo associado programaticamente, por exemplo <label for=\"forma-presencial\">Presencial</label>.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html"
      ]
    },
    "evidence": [
      "scan S-page-001 finding F-011 (axe 'label', critical)",
      "scan S-page-002 findings F-024 e F-023 (axe 'label' e 'label-title-only')",
      "verify_finding V-004: ruleExists=pass, applicability=pass, evidenceConsistent=pass",
      "DOM: outerHTML de fieldset.grupo-forma"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao, secao Solicitacoes anteriores (tabela + paginacao)",
    "estados: carga inicial, erro de validacao apos Enviar vazio, envio bem-sucedido, lista do br-select aberta, calendario do br-datetimepicker aberto"
  ],
  "notes": "Interacoes realizadas: carga inicial em 1280x900; snapshot da arvore de acessibilidade; tabulacao a partir de pagina recem-carregada (primeiro Tab); clique em Enviar com formulario vazio; foco e acionamento do botao de fechar da mensagem de erro com Enter e com Space (ambos funcionam e removem a mensagem); abertura da lista de #servico e de #unidade por ArrowDown e selecao por Enter (aria-expanded alterna corretamente e o foco vai para o primeiro br-item); Enter dentro de #servico dispara submissao implicita do formulario (comportamento nativo, nao tratado como defeito); preenchimento completo e envio bem-sucedido (mensagem br-message success, aria-invalid limpos, foco movido para .content[role=alert]); abertura do calendario pelo botao #data-preferencial-btn e inspecao dos controles de mes; leitura de CSS computado e de regras de origem para distinguir folha do @govbr-ds/core da folha da aplicacao. Varreduras do oraculo: S-page-001 (estado inicial, fingerprint sha256:fec51e82...) e S-page-002 (estado de erro, fingerprint sha256:d5b6611b...). Candidatos rejeitados e por que: (a) as 6 deteccoes ds-token-spacing/ds-token-radius (#descricao 6px, #servico e #unidade padding 29px, .br-list margin -2px, select do flatpickr) foram rejeitadas - verify_finding V-001 devolveu verdict=rejected, applicability=fail, 'verificacao deterministica sem norma nomeada nao produz achado' (D-27), e a inspecao de origem mostrou que todos esses valores vem da folha do proprio @govbr-ds/core (jsx-runtime-B-RTDNcS.css), nao da aplicacao; (b) ds-structure-button-tag no <a class='br-button circle'> do breadcrumb e no <div class='br-button' role='button'> do fechar da mensagem de erro - rejeitado por V-003 pelo mesmo motivo de ausencia de norma nomeada, e no caso do breadcrumb o exemplo canonico breadcrumb-default do proprio DS usa exatamente <a class='br-button circle'>; o div com role=button tem nome acessivel e responde a Enter e a Space, entao nao restou violacao normativa a citar; (c) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - coincide com os exemplos canonicos datetimepicker-simple/range/time do DS, rejeitado; (d) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos pagination-default/sizes/ellipsis tambem usam apenas a classe active e o oraculo nao expoe regra para isso: classificado como incerto e nao reportado; (e) ausencia de <ul>/<li> envolvendo os itens da paginacao e classes fora do vocabulario canonico (trilha-servico, acao-enviar, tabela-anteriores etc.) - o proprio oraculo as trata como observacao sem norma; (f) #servico mantem aria-invalid='true' e a mensagem de erro depois de a opcao ser escolhida (a limpeza so ocorre em nova submissao) - nao encontrei norma que exija revalidacao imediata, fica como incerto; (g) apos fechar a mensagem de erro o foco volta para <body> - incerto, nao reportado. Limitacoes: axe-core 4.12.1 rodou com 0 resultados incomplete e nenhuma violacao de contraste; emag-6.2, emag-6.3 e emag-2.2 nao tem predicado mecanico no oraculo (verify_finding V-002 e V-004 devolveram 'no-predicate' com ruleExists=pass, applicability=pass e evidenceConsistent=pass), de modo que esses achados se apoiam em inspecao direta do DOM, do CSS computado e da operacao por teclado, e nao em confirmacao mecanica; nao foi possivel exercitar o envio real de arquivo no input de upload; nao foram avaliados outros viewports alem de 1280x900."
}
````

### Decisão

````json
{
  "cardId": "C-94a4aaa8f81d74dbe6e03d789c42fdb9f9f2f2bfa10171592291aba31f57faee",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-9c02ee2979e422fdae14c520bf90f1abd246e5f2b5e88796446ea5a7d0d7f220

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: A tabela de 'Solicitacoes anteriores' nao tem <caption> (document.querySelectorAll('.tabela-anteriores table caption').length === 0). O titulo aparece somente como <div class="table-title">Solicitacoes anteriores</div>, fora do elemento table.

Esperado: A tabela deve trazer <caption> com o titulo, como no exemplo canonico 'table' do br-table no gov.br DS. Os cabecalhos ja usam <th scope="col">, de modo que falta apenas a legenda.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html

Regra declarada: emag-3.9

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>section>div>table" — <table> "Protocolo Serviço Data Situação 2026.0918.004417"

### Unidades candidatas (não são crédito)

- U-6db298382eaecec8e3346bd8ea72a635adfaa9c2ebfbbe38cb860faff6759a16 — A-05 · sempre · cena 1280x900 · <div> "Solicitações anteriores Protocolo Serviço Data S": Estrato E · variante caption-removido. A tabela de solicitações anteriores não tem <caption>; o título visível é um div da barra superior do componente, fora do <table>. Sem predicado na referência (nenhuma espécie mede ausência de elemento filho); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `DOM: outerHTML de div.br-table.tabela-anteriores sem caption` → identificador devolvido por ferramenta (sem arquivo)
- `get_component_spec('table') exemplo 'table' inclui <caption>Titulo da Tabela</caption>` → não encontrado na evidência preservada da execução
- `get_emag_rules secao 3, regra 3.9` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".tabela-anteriores table",
    "rule": "emag-3.9",
    "observed": "A tabela de 'Solicitacoes anteriores' nao tem <caption> (document.querySelectorAll('.tabela-anteriores table caption').length === 0). O titulo aparece somente como <div class=\"table-title\">Solicitacoes anteriores</div>, fora do elemento table.",
    "expected": "A tabela deve trazer <caption> com o titulo, como no exemplo canonico 'table' do br-table no gov.br DS. Os cabecalhos ja usam <th scope=\"col\">, de modo que falta apenas a legenda.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html"
      ]
    },
    "evidence": [
      "DOM: outerHTML de div.br-table.tabela-anteriores sem caption",
      "get_component_spec('table') exemplo 'table' inclui <caption>Titulo da Tabela</caption>",
      "get_emag_rules secao 3, regra 3.9"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao, secao Solicitacoes anteriores (tabela + paginacao)",
    "estados: carga inicial, erro de validacao apos Enviar vazio, envio bem-sucedido, lista do br-select aberta, calendario do br-datetimepicker aberto"
  ],
  "notes": "Interacoes realizadas: carga inicial em 1280x900; snapshot da arvore de acessibilidade; tabulacao a partir de pagina recem-carregada (primeiro Tab); clique em Enviar com formulario vazio; foco e acionamento do botao de fechar da mensagem de erro com Enter e com Space (ambos funcionam e removem a mensagem); abertura da lista de #servico e de #unidade por ArrowDown e selecao por Enter (aria-expanded alterna corretamente e o foco vai para o primeiro br-item); Enter dentro de #servico dispara submissao implicita do formulario (comportamento nativo, nao tratado como defeito); preenchimento completo e envio bem-sucedido (mensagem br-message success, aria-invalid limpos, foco movido para .content[role=alert]); abertura do calendario pelo botao #data-preferencial-btn e inspecao dos controles de mes; leitura de CSS computado e de regras de origem para distinguir folha do @govbr-ds/core da folha da aplicacao. Varreduras do oraculo: S-page-001 (estado inicial, fingerprint sha256:fec51e82...) e S-page-002 (estado de erro, fingerprint sha256:d5b6611b...). Candidatos rejeitados e por que: (a) as 6 deteccoes ds-token-spacing/ds-token-radius (#descricao 6px, #servico e #unidade padding 29px, .br-list margin -2px, select do flatpickr) foram rejeitadas - verify_finding V-001 devolveu verdict=rejected, applicability=fail, 'verificacao deterministica sem norma nomeada nao produz achado' (D-27), e a inspecao de origem mostrou que todos esses valores vem da folha do proprio @govbr-ds/core (jsx-runtime-B-RTDNcS.css), nao da aplicacao; (b) ds-structure-button-tag no <a class='br-button circle'> do breadcrumb e no <div class='br-button' role='button'> do fechar da mensagem de erro - rejeitado por V-003 pelo mesmo motivo de ausencia de norma nomeada, e no caso do breadcrumb o exemplo canonico breadcrumb-default do proprio DS usa exatamente <a class='br-button circle'>; o div com role=button tem nome acessivel e responde a Enter e a Space, entao nao restou violacao normativa a citar; (c) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - coincide com os exemplos canonicos datetimepicker-simple/range/time do DS, rejeitado; (d) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos pagination-default/sizes/ellipsis tambem usam apenas a classe active e o oraculo nao expoe regra para isso: classificado como incerto e nao reportado; (e) ausencia de <ul>/<li> envolvendo os itens da paginacao e classes fora do vocabulario canonico (trilha-servico, acao-enviar, tabela-anteriores etc.) - o proprio oraculo as trata como observacao sem norma; (f) #servico mantem aria-invalid='true' e a mensagem de erro depois de a opcao ser escolhida (a limpeza so ocorre em nova submissao) - nao encontrei norma que exija revalidacao imediata, fica como incerto; (g) apos fechar a mensagem de erro o foco volta para <body> - incerto, nao reportado. Limitacoes: axe-core 4.12.1 rodou com 0 resultados incomplete e nenhuma violacao de contraste; emag-6.2, emag-6.3 e emag-2.2 nao tem predicado mecanico no oraculo (verify_finding V-002 e V-004 devolveram 'no-predicate' com ruleExists=pass, applicability=pass e evidenceConsistent=pass), de modo que esses achados se apoiam em inspecao direta do DOM, do CSS computado e da operacao por teclado, e nao em confirmacao mecanica; nao foi possivel exercitar o envio real de arquivo no input de upload; nao foram avaliados outros viewports alem de 1280x900."
}
````

### Decisão

````json
{
  "cardId": "C-9c02ee2979e422fdae14c520bf90f1abd246e5f2b5e88796446ea5a7d0d7f220",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-a3547056f912211f37748f456e252b17383b2656cc90e2d72b42cfb478bb73a4

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: As 42 celulas de dia do calendario usam tabindex="1" (positivo) - verifiquei que todas, sem excecao, tem tabindex='1'. Somadas ao .upload-button, a pagina fica com 43 elementos de tabindex positivo, que sao percorridos antes de toda a ordem natural do documento, quebrando a sequencia de navegacao da tela.

Esperado: A ordem de navegacao deve seguir a ordem logica do codigo, com tabindex apenas quando indispensavel e sem valores positivos; celulas de dia devem usar tabindex="-1" com navegacao por setas, ou "0".

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em #data-preferencial-btn para abrir o calendario

Regra declarada: emag:6.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(1)" — <span> "Agosto 30, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(10)" — <span> "Setembro 8, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(11)" — <span> "Setembro 9, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(12)" — <span> "Setembro 10, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(13)" — <span> "Setembro 11, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(14)" — <span> "Setembro 12, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(15)" — <span> "Setembro 13, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(16)" — <span> "Setembro 14, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(17)" — <span> "Setembro 15, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(18)" — <span> "Setembro 16, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(19)" — <span> "Setembro 17, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(2)" — <span> "Agosto 31, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(20)" — <span> "Setembro 18, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(21)" — <span> "Setembro 19, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(22)" — <span> "Setembro 20, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(23)" — <span> "Setembro 21, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(24)" — <span> "Setembro 22, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(25)" — <span> "Setembro 23, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(26)" — <span> "Setembro 24, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(27)" — <span> "Setembro 25, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(28)" — <span> "Setembro 26, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(29)" — <span> "Setembro 27, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(3)" — <span> "Setembro 1, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(30)" — <span> "Setembro 28, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(31)" — <span> "Setembro 29, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(32)" — <span> "Setembro 30, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(33)" — <span> "Outubro 1, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(34)" — <span> "Outubro 2, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(35)" — <span> "Outubro 3, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(36)" — <span> "Outubro 4, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(37)" — <span> "Outubro 5, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(38)" — <span> "Outubro 6, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(39)" — <span> "Outubro 7, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(4)" — <span> "Setembro 2, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(40)" — <span> "Outubro 8, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(41)" — <span> "Outubro 9, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(42)" — <span> "Outubro 10, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(5)" — <span> "Setembro 3, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(6)" — <span> "Setembro 4, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(7)" — <span> "Setembro 5, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(8)" — <span> "Setembro 6, 2026" · **oculto**: nao-renderizado
- "body>div:nth-of-type(2)>div:nth-of-type(2)>div>div:nth-of-type(2)>div>span:nth-of-type(9)" — <span> "Setembro 7, 2026" · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate no estado de calendario aberto: document.querySelectorAll('.flatpickr-day').length = 42 e todas com tabindex='1'; amostra '<span class="flatpickr-day prevMonthDay" aria-label="Agosto 30, 2026" tabindex="1">30</span>'` → não encontrado na evidência preservada da execução
- `browser_evaluate: document.querySelectorAll('[tabindex="1"]').length = 43` → identificador devolvido por ferramenta (sem arquivo)
- `browser_press_key Tab a partir do carregamento: o foco salta para o primeiro elemento de tabindex positivo (.upload-button) em vez do skiplink, demonstrando o efeito do tabindex positivo na ordem` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".flatpickr-day",
    "relatedSelectors": [
      ".upload-button"
    ],
    "rule": "emag:6.3",
    "observed": "As 42 celulas de dia do calendario usam tabindex=\"1\" (positivo) - verifiquei que todas, sem excecao, tem tabindex='1'. Somadas ao .upload-button, a pagina fica com 43 elementos de tabindex positivo, que sao percorridos antes de toda a ordem natural do documento, quebrando a sequencia de navegacao da tela.",
    "expected": "A ordem de navegacao deve seguir a ordem logica do codigo, com tabindex apenas quando indispensavel e sem valores positivos; celulas de dia devem usar tabindex=\"-1\" com navegacao por setas, ou \"0\".",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em #data-preferencial-btn para abrir o calendario"
      ]
    },
    "evidence": [
      "browser_evaluate no estado de calendario aberto: document.querySelectorAll('.flatpickr-day').length = 42 e todas com tabindex='1'; amostra '<span class=\"flatpickr-day prevMonthDay\" aria-label=\"Agosto 30, 2026\" tabindex=\"1\">30</span>'",
      "browser_evaluate: document.querySelectorAll('[tabindex=\"1\"]').length = 43",
      "browser_press_key Tab a partir do carregamento: o foco salta para o primeiro elemento de tabindex positivo (.upload-button) em vez do skiplink, demonstrando o efeito do tabindex positivo na ordem"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao (nome, CPF, dois br-select, grupo de radio, datetimepicker, textarea, upload, checkboxes, declaracao, acoes), mensagem de retorno de validacao, tabela de solicitacoes anteriores e paginacao"
  ],
  "notes": "Viewport 1280x900. Interacoes executadas: submissao do formulario vazio via .acao-enviar (mensagem br-message danger + feedbacks por campo + aria-invalid + foco movido para .content[role=alert][tabindex=-1]); fechamento da mensagem pelo controle .close com Enter via teclado (funcionou, mensagem removida); abertura/fechamento do br-select 'Tipo de servico' por clique no botao data-trigger e por ArrowDown com foco no input (aria-expanded alterna corretamente em ambos); foco/clique em #data-preferencial (NAO abre o calendario) e clique em #data-preferencial-btn (abre); inspecao da arvore do calendario aberto; Tab unico a partir do carregamento (foco caiu em .upload-button, nao no skiplink); clique em 'Pagina 2' da paginacao (as linhas da tabela mudam e data-current vai para 2, funcional). Varreduras do oraculo: S-page-001 (estado inicial) e S-page-002 (apos clique em .acao-enviar, comparada por compareToScanId). CANDIDATOS REJEITADOS, com motivo: (a) ds-structure-button-tag sobre o <a class='br-button circle'> do breadcrumb - o exemplo canonico breadcrumb-default usa exatamente <a class='br-button circle'>, entao a marcacao esta conforme; (b) ds-structure-button-tag sobre o <div class='br-button' role='button'> do fechar-mensagem - diverge do exemplo canonico message-padrao, que usa <button>, e seria um achado plausivel, mas verify_finding rejeitou o id (D-27: 'ds-structure-button-tag nao declara qual regra normativa implementa'), e o protocolo proibe emprestar o id de outra norma para sustentar exigencia estrutural; alem disso confirmei por teclado que o controle e operavel com Enter; (c) todos os ds-token-spacing e ds-token-radius (padding 29px em #servico/#unidade, margin -2px nas .br-list, border-radius 6px em #descricao, margin do select do flatpickr) - verify_finding rejeitou ds-token-spacing e ds-token-radius pelo mesmo D-27; permanecem como observacoes de revisao, nao como achados, ainda que 6px em #descricao destoe dos 4px dos demais controles; (d) o F-017 do scanner alega escala violada mas reporta 'margin: 0px', valor que esta na escala - evidencia autocontraditoria; (e) label-title-only em #forma-presencial - mesmo defeito ja reportado sob e-MAG 6.2, nao repetido sob outra regra; (f) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - identico aos exemplos canonicos do datetimepicker, e o campo aceita digitacao com instrucao de formato, entao ha alternativa de entrada; (g) <span tabindex='0' aria-current='page'> do breadcrumb - presente literalmente no exemplo canonico; (h) papel combobox no wrapper .br-input e opcoes como radio dentro de .br-list - padrao canonico do br-select, e verifiquei que e operavel por teclado; (i) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos de paginacao tambem nao usam aria-current, sem norma para sustentar; (j) erro de console 404 de /favicon.ico - irrelevante para conformidade. LIMITACOES: avaliei apenas o viewport 1280x900, sem checagem responsiva em larguras menores; nao testei leitor de tela real, apenas a arvore de acessibilidade e atributos ARIA; nao exercitei o upload de arquivo real nem uma submissao valida completa ate o estado de sucesso, entao o estado de sucesso do formulario nao foi avaliado; os ids das .br-list sao gerados aleatoriamente a cada carga, por isso nenhum seletor deste relatorio depende deles; os achados 4, 5 e 6 estao na marcacao do flatpickr embutido no componente datetimepicker, e nao no codigo proprio da tela, mas integram a interface entregue."
}
````

### Decisão

````json
{
  "cardId": "C-a3547056f912211f37748f456e252b17383b2656cc90e2d72b42cfb478bb73a4",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-acf16e829fa44560c34d39579546d72f9a7cee10b71882234a8accd9cb5a551d

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: margin: -2px 0px 0px (fora da escala: -2px)

Esperado: Múltiplos de 4px

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:token-spacing

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "unresolved:#list-4514" — Seletor não resolvido

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#list-4514",
    "rule": "ds:token-spacing",
    "observed": "margin: -2px 0px 0px (fora da escala: -2px)",
    "expected": "Múltiplos de 4px",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-acf16e829fa44560c34d39579546d72f9a7cee10b71882234a8accd9cb5a551d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ae85203c016854fe5e67b0cb64de88ac9a6062b556c5d89a34d6a3e293c81697

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: Form elements should have a visible label

Esperado: (ausente)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: axe:label-title-only

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>fieldset:nth-of-type(1)>div:nth-of-type(1)>input" — <input#forma-presencial>

### Unidades candidatas (não são crédito)

- U-471fd34bfed8d491133fe60cfe6233aa00117fefb796768495ff7598fa7a6a5e — A-09 · sempre · cena 1280x900 · <input#forma-presencial>: Estrato S · variante label-sem-for, na primeira opção do grupo (convenção registrada em tela-a/construcao.md). O <label> de "Presencial" não tem for: o radio fica sem nome acessível e clicar no texto não o marca. As outras duas opções estão associadas.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: for, aria-label, aria-labelledby. Medido: ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#forma-presencial",
    "rule": "axe:label-title-only",
    "observed": "Form elements should have a visible label",
    "expected": null,
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-ae85203c016854fe5e67b0cb64de88ac9a6062b556c5d89a34d6a3e293c81697",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-afd44feadc495269a2d978494729776a552a06421a459321f6fbdfead5e60574

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Após envio inválido, #unidade recebe aria-invalid="true" mas aria-describedby é null; a mensagem <span class="feedback danger retorno-campo" role="alert">Selecione a unidade de atendimento.</span> não tem id e não é referenciada pelo campo.

Esperado: A mensagem de erro do campo deve ser programaticamente associada ao controle inválido (id na mensagem e aria-describedby no input), como nos outros campos do mesmo formulário.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em Enviar com o formulário vazio

Regra declarada: wcag:1.3.1

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T03-16-27-242Z.yml (estado de erro)` → não encontrado na evidência preservada da execução
- `browser_evaluate: {id:"unidade", invalid:"true", desc:null} e span de erro sem atributo id` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#unidade",
    "relatedSelectors": [
      ".campo-unidade .br-select .feedback.retorno-campo"
    ],
    "rule": "wcag:1.3.1",
    "observed": "Após envio inválido, #unidade recebe aria-invalid=\"true\" mas aria-describedby é null; a mensagem <span class=\"feedback danger retorno-campo\" role=\"alert\">Selecione a unidade de atendimento.</span> não tem id e não é referenciada pelo campo.",
    "expected": "A mensagem de erro do campo deve ser programaticamente associada ao controle inválido (id na mensagem e aria-describedby no input), como nos outros campos do mesmo formulário.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em Enviar com o formulário vazio"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T03-16-27-242Z.yml (estado de erro)",
      "browser_evaluate: {id:\"unidade\", invalid:\"true\", desc:null} e span de erro sem atributo id"
    ]
  },
  "scope": [
    "tela inteira /solicitacao.html: skiplink, cabeçalho, breadcrumb, formulário de solicitação (nome, CPF, dois selects br-select, grupo de rádios, datetimepicker, textarea, upload, grupo de checkboxes, declaração, ações), mensagens de retorno de envio, tabela \"Solicitações anteriores\" e paginação"
  ],
  "notes": "Sem oráculo de regras nesta execução: nenhuma ferramenta de consulta de regras, scan_page ou verificação heurística estava disponível; as atribuições usam wcag:<critério> apenas quando justificáveis e rule:null quando não. Interações realizadas: carga inicial e árvore de acessibilidade; Tab a partir do topo (13 paradas registradas por listener de focusin); abertura dos dois selects por mouse e por teclado (ArrowDown/Enter) com verificação de aria-expanded e valor; clique no rótulo \"Presencial\" e seleção do mesmo rádio por Espaço; envio do formulário vazio (mensagem \"Há 8 campo(s) obrigatório(s) sem preenchimento\", foco movido para o role=alert) e inspeção de aria-invalid/aria-describedby de todos os campos; fechamento da mensagem de erro pelo teclado (Enter no div role=button, funcionou); preenchimento completo e envio bem-sucedido; clique em \"Página 2\" da paginação; varredura de contraste de texto calculada em 1280x900 nos estados inicial e de erro (nenhuma reprovação); verificação de reflow em 320x640. Limitações e pontos incertos, não reportados como achados: (a) o papel combobox está no div .br-input e não no input focável (#servico/#unidade não expõem aria-expanded/aria-controls) — padrão do próprio design system, aplicabilidade incerta sem oráculo; (b) após escolher uma opção do select pelo teclado o foco vai para <body> em vez de voltar ao input; (c) o botão do calendário (#data-preferencial-btn) tem aria-hidden=\"true\" e tabindex=\"-1\", ficando indisponível a teclado e a leitores de tela, embora a data possa ser digitada; (d) em 320x640 a página rola horizontalmente (scrollWidth 545 vs clientWidth 305) por causa da tabela de solicitações anteriores, caso possivelmente coberto pela exceção de tabelas de dados do reflow; (e) a data \"30/02/2026\" digitada foi normalizada silenciosamente para \"02/03/2026\"; (f) a solicitação enviada com sucesso não passa a constar na tabela \"Solicitações anteriores\"; (g) o diálogo de seleção de arquivo não pôde ser exercido; (h) único erro de console é 404 de /favicon.ico. Todos os seletores enviados foram executados com document.querySelectorAll na página e resolvem para exatamente 1 elemento."
}
````

### Decisão

````json
{
  "cardId": "C-afd44feadc495269a2d978494729776a552a06421a459321f6fbdfead5e60574",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b12bbecf5e375be027e0346a0f97765a5a496fe7950ff480fefb7a11217cc9cc

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Uma regra da folha de estilo da página (solicitacao) anula o indicador de foco dos dois campos de combobox: '.campo-servico .br-input input:focus, .campo-servico .br-input input:focus-visible, .campo-unidade .br-input input:focus, .campo-unidade .br-input input:focus-visible { box-shadow: none; outline: none; border-color: var(--border-color-alternative) !important; }'. Medindo o estilo computado antes e depois de focar, #servico ficou idêntico (border rgb(136,136,136) 0.666667px, box-shadow none, outline none), enquanto #nome, no mesmo estado, muda para border rgb(194,133,12) e box-shadow rgb(194,133,12) 0 0 0 2px.

Esperado: Os campos devem manter um indicador de foco visível ao receberem foco por teclado, como os demais campos de texto da tela (borda e halo na cor de foco rgb(194,133,12)).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. ler estilo computado de #servico, #unidade e #nome sem foco 3. focar #servico simulando foco por teclado e reler o estilo computado 4. focar #nome e reler o estilo computado 5. listar as regras CSS de foco aplicáveis a inputs

Regra declarada: wcag:2.4.7

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(1)>div>div:nth-of-type(1)>div>input" — <input#servico> "Selecione uma opção"
- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a10dcb076ad236543b32667bd7e0adfec72fef26085a4924a9eb55ecf74492e3 — A-08 · apos-envio-vazio · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4c4e6005ce86b914ed8b58011b3f8effcee1326c119327ddd4eb9e9e0540a41 — A-04 · sempre · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate: identicalServico=true, identicalNome=false` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: regra CSS '.campo-servico .br-input input:focus, ... { box-shadow: none; outline: none; border-color: var(--border-color-alternative) !important; }'` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: afterServico borderColor=rgb(136,136,136) boxShadow=none; afterNome borderColor=rgb(194,133,12) boxShadow=rgb(194,133,12) 0px 0px 0px 2px` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#servico, #unidade",
    "rule": "wcag:2.4.7",
    "observed": "Uma regra da folha de estilo da página (solicitacao) anula o indicador de foco dos dois campos de combobox: '.campo-servico .br-input input:focus, .campo-servico .br-input input:focus-visible, .campo-unidade .br-input input:focus, .campo-unidade .br-input input:focus-visible { box-shadow: none; outline: none; border-color: var(--border-color-alternative) !important; }'. Medindo o estilo computado antes e depois de focar, #servico ficou idêntico (border rgb(136,136,136) 0.666667px, box-shadow none, outline none), enquanto #nome, no mesmo estado, muda para border rgb(194,133,12) e box-shadow rgb(194,133,12) 0 0 0 2px.",
    "expected": "Os campos devem manter um indicador de foco visível ao receberem foco por teclado, como os demais campos de texto da tela (borda e halo na cor de foco rgb(194,133,12)).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "ler estilo computado de #servico, #unidade e #nome sem foco",
        "focar #servico simulando foco por teclado e reler o estilo computado",
        "focar #nome e reler o estilo computado",
        "listar as regras CSS de foco aplicáveis a inputs"
      ]
    },
    "evidence": [
      "browser_evaluate: identicalServico=true, identicalNome=false",
      "browser_evaluate: regra CSS '.campo-servico .br-input input:focus, ... { box-shadow: none; outline: none; border-color: var(--border-color-alternative) !important; }'",
      "browser_evaluate: afterServico borderColor=rgb(136,136,136) boxShadow=none; afterNome borderColor=rgb(194,133,12) boxShadow=rgb(194,133,12) 0px 0px 0px 2px"
    ]
  },
  "scope": [
    "solicitacao.html — tela inteira: skiplink, cabeçalho gov.br, breadcrumb, formulário de solicitação (nome, CPF, tipo de serviço, unidade, forma de atendimento, data preferencial, descrição, documentos, recursos de acessibilidade, declaração, ações) e seção 'Solicitações anteriores' com tabela e paginação",
    "estados observados: carga inicial; combobox aberto; formulário submetido vazio (erros); formulário submetido válido (sucesso); paginação na página 2; viewport 320x800"
  ],
  "notes": "Ferramentas usadas: navegação, snapshot da árvore de acessibilidade, avaliação de DOM/CSS computado, teclado e mouse. Interações executadas: Tab a partir do início do documento para verificar ordem de foco; abertura e fechamento dos dois comboboxes por clique e por teclado (ArrowDown/Enter); seleção de opções; clique no rótulo 'Presencial' e no input correspondente; navegação por ArrowUp dentro do grupo de rádio; preenchimento de nome, CPF, data e descrição; submissão com campos vazios e verificação das mensagens de erro, de aria-invalid, de aria-describedby e do destino do foco; fechamento da mensagem de erro por Enter no controle 'Fechar a mensagem' (funcionou); submissão válida completa e verificação da mensagem de sucesso (role=alert, foco movido, aria-invalid limpo); clique em 'Página 2' da paginação; redimensionamento para 320x800 e medição de transbordo. Contraste verificado por cálculo de razão em 23 combinações de texto e fundo (rótulos, textos de apoio, mensagens, botões, breadcrumb, paginação, tabela, skiplink): todas passaram em AA, nenhum achado de contraste. Indicadores de foco verificados em 16 controles. Limitações: nenhum oráculo de regras nem ferramenta scan_page/verificação heurística estava disponível nesta execução, portanto não há identificadores de regra devolvidos por ferramenta; as atribuições usam critérios WCAG que consigo justificar pela observação, e os candidatos que não consegui atribuir com segurança foram deixados fora dos achados e estão declarados aqui como incertos. Incertos (observados, não reportados como achado por atribuição normativa insegura ou por serem possivelmente o comportamento padrão do Design System gov.br, não um defeito da tela): (1) o skiplink usa nav[role=menubar] com a[role=menuitem] para um único link de atalho, o que faz leitores de tela anunciarem barra de menus em vez de link; (2) role=combobox está no wrapper div.br-input, que não é focalizável, enquanto o elemento que recebe foco (#servico/#unidade) é exposto como textbox simples, sem aria-expanded — o estado de expansão existe mas fica no wrapper; as opções em role=option não têm aria-selected; (3) o span do item atual do breadcrumb tem tabindex=0, criando uma parada de foco sem ação; (4) a troca de página da tabela não é anunciada (o conteúdo muda sem região viva e o foco permanece no link). O erro 404 de /favicon.ico no console é irrelevante para conformidade. Um único achado usa seletor com dois elementos (#servico, #unidade) porque a mesma regra CSS produz a mesma afirmação para ambos."
}
````

### Decisão

````json
{
  "cardId": "C-b12bbecf5e375be027e0346a0f97765a5a496fe7950ff480fefb7a11217cc9cc",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b296921b8708822af84a51dd4fcf72de3a61091350bad61e860170f01e99af78

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: border-radius: 6px fora da escala do DS

Esperado: Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:token-radius

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(5)>div>textarea" — <textarea#descricao>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#descricao",
    "rule": "ds:token-radius",
    "observed": "border-radius: 6px fora da escala do DS",
    "expected": "Um de: 0px, 4px, 8px, 16px, 50% (circle) ou pill (100em/999em × font-size)",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-b296921b8708822af84a51dd4fcf72de3a61091350bad61e860170f01e99af78",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b654e69f99b45ec4ed21d22b34987450cec0c7a59ef0d1e5bb77a56cef9026af

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Com o calendario aberto, o botao de proximo mes e focalizavel e contem apenas o icone <i class="fas fa-chevron-right">, sem aria-label e sem texto: nome acessivel vazio.

Esperado: Controle interativo apenas com icone precisa de nome acessivel, por exemplo aria-label="Proximo mes".

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em #data-preferencial-btn para abrir o calendario

Regra declarada: emag:2.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(1)>span:nth-of-type(2)>button" — <button> · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan_page S-page-001 finding F-009 (emag-2.2, serious, 'Elemento interativo apenas com icone, sem aria-label (br-button)')` → identificador devolvido por ferramenta (sem arquivo)
- `scan_page S-page-002 finding F-021 (mesma regra)` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate no estado de calendario aberto: segundo BUTTON de .flatpickr-calendar com {label:null, text:'', tabindex:null}` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: outerHTML = '<button class="br-button circle small" type="button"><i class="fas fa-chevron-right"></i></button>'` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": ".flatpickr-next-month > button",
    "relatedSelectors": [
      "#data-preferencial-btn"
    ],
    "rule": "emag:2.2",
    "observed": "Com o calendario aberto, o botao de proximo mes e focalizavel e contem apenas o icone <i class=\"fas fa-chevron-right\">, sem aria-label e sem texto: nome acessivel vazio.",
    "expected": "Controle interativo apenas com icone precisa de nome acessivel, por exemplo aria-label=\"Proximo mes\".",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em #data-preferencial-btn para abrir o calendario"
      ]
    },
    "evidence": [
      "scan_page S-page-001 finding F-009 (emag-2.2, serious, 'Elemento interativo apenas com icone, sem aria-label (br-button)')",
      "scan_page S-page-002 finding F-021 (mesma regra)",
      "browser_evaluate no estado de calendario aberto: segundo BUTTON de .flatpickr-calendar com {label:null, text:'', tabindex:null}",
      "browser_evaluate: outerHTML = '<button class=\"br-button circle small\" type=\"button\"><i class=\"fas fa-chevron-right\"></i></button>'"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao (nome, CPF, dois br-select, grupo de radio, datetimepicker, textarea, upload, checkboxes, declaracao, acoes), mensagem de retorno de validacao, tabela de solicitacoes anteriores e paginacao"
  ],
  "notes": "Viewport 1280x900. Interacoes executadas: submissao do formulario vazio via .acao-enviar (mensagem br-message danger + feedbacks por campo + aria-invalid + foco movido para .content[role=alert][tabindex=-1]); fechamento da mensagem pelo controle .close com Enter via teclado (funcionou, mensagem removida); abertura/fechamento do br-select 'Tipo de servico' por clique no botao data-trigger e por ArrowDown com foco no input (aria-expanded alterna corretamente em ambos); foco/clique em #data-preferencial (NAO abre o calendario) e clique em #data-preferencial-btn (abre); inspecao da arvore do calendario aberto; Tab unico a partir do carregamento (foco caiu em .upload-button, nao no skiplink); clique em 'Pagina 2' da paginacao (as linhas da tabela mudam e data-current vai para 2, funcional). Varreduras do oraculo: S-page-001 (estado inicial) e S-page-002 (apos clique em .acao-enviar, comparada por compareToScanId). CANDIDATOS REJEITADOS, com motivo: (a) ds-structure-button-tag sobre o <a class='br-button circle'> do breadcrumb - o exemplo canonico breadcrumb-default usa exatamente <a class='br-button circle'>, entao a marcacao esta conforme; (b) ds-structure-button-tag sobre o <div class='br-button' role='button'> do fechar-mensagem - diverge do exemplo canonico message-padrao, que usa <button>, e seria um achado plausivel, mas verify_finding rejeitou o id (D-27: 'ds-structure-button-tag nao declara qual regra normativa implementa'), e o protocolo proibe emprestar o id de outra norma para sustentar exigencia estrutural; alem disso confirmei por teclado que o controle e operavel com Enter; (c) todos os ds-token-spacing e ds-token-radius (padding 29px em #servico/#unidade, margin -2px nas .br-list, border-radius 6px em #descricao, margin do select do flatpickr) - verify_finding rejeitou ds-token-spacing e ds-token-radius pelo mesmo D-27; permanecem como observacoes de revisao, nao como achados, ainda que 6px em #descricao destoe dos 4px dos demais controles; (d) o F-017 do scanner alega escala violada mas reporta 'margin: 0px', valor que esta na escala - evidencia autocontraditoria; (e) label-title-only em #forma-presencial - mesmo defeito ja reportado sob e-MAG 6.2, nao repetido sob outra regra; (f) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - identico aos exemplos canonicos do datetimepicker, e o campo aceita digitacao com instrucao de formato, entao ha alternativa de entrada; (g) <span tabindex='0' aria-current='page'> do breadcrumb - presente literalmente no exemplo canonico; (h) papel combobox no wrapper .br-input e opcoes como radio dentro de .br-list - padrao canonico do br-select, e verifiquei que e operavel por teclado; (i) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos de paginacao tambem nao usam aria-current, sem norma para sustentar; (j) erro de console 404 de /favicon.ico - irrelevante para conformidade. LIMITACOES: avaliei apenas o viewport 1280x900, sem checagem responsiva em larguras menores; nao testei leitor de tela real, apenas a arvore de acessibilidade e atributos ARIA; nao exercitei o upload de arquivo real nem uma submissao valida completa ate o estado de sucesso, entao o estado de sucesso do formulario nao foi avaliado; os ids das .br-list sao gerados aleatoriamente a cada carga, por isso nenhum seletor deste relatorio depende deles; os achados 4, 5 e 6 estao na marcacao do flatpickr embutido no componente datetimepicker, e nao no codigo proprio da tela, mas integram a interface entregue."
}
````

### Decisão

````json
{
  "cardId": "C-b654e69f99b45ec4ed21d22b34987450cec0c7a59ef0d1e5bb77a56cef9026af",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c2dc2499abd000a4ded1ba1ca706c792fd603d95e353257b899795c70dec5c04

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O campo aceitou 520 caracteres (value.length=520), não tem maxlength nem contador, e o formulário foi enviado com sucesso sem erro associado ao campo.

Esperado: Respeitar o limite anunciado pela orientação #descricao-apoio ("Descreva o que você precisa, em até 500 caracteres."), impedindo ou sinalizando a entrada acima de 500 caracteres.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. preencher #descricao com 520 caracteres 3. preencher os demais campos obrigatórios 4. clicar em Enviar

Regra declarada: nenhuma (atribuição incerta)

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

Sinalizações: regra-incerta

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(5)>div>textarea" — <textarea#descricao>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `browser_evaluate: #descricao.value.length=520, getAttribute('maxlength')=null` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate após o envio: .retorno-envio.textContent="Solicitação enviada...", #descricao aria-invalid=null` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#descricao",
    "relatedSelectors": [
      "#descricao-apoio"
    ],
    "rule": null,
    "observed": "O campo aceitou 520 caracteres (value.length=520), não tem maxlength nem contador, e o formulário foi enviado com sucesso sem erro associado ao campo.",
    "expected": "Respeitar o limite anunciado pela orientação #descricao-apoio (\"Descreva o que você precisa, em até 500 caracteres.\"), impedindo ou sinalizando a entrada acima de 500 caracteres.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "preencher #descricao com 520 caracteres",
        "preencher os demais campos obrigatórios",
        "clicar em Enviar"
      ]
    },
    "evidence": [
      "browser_evaluate: #descricao.value.length=520, getAttribute('maxlength')=null",
      "browser_evaluate após o envio: .retorno-envio.textContent=\"Solicitação enviada...\", #descricao aria-invalid=null"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-c2dc2499abd000a4ded1ba1ca706c792fd603d95e353257b899795c70dec5c04",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c75a5f2ad92060b8b10d5f1b4fe987aebe792dd985adb6331c2a18f0bc5288c2

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O botão de upload tem tabindex="1" (único tabindex positivo da página). A partir do topo do documento, o primeiro Tab leva o foco para .upload-button, que fica no fim do formulário, antes do link "Ir para o conteúdo", da marca gov.br, do breadcrumb e de todos os campos.

Esperado: A ordem de foco deve seguir a ordem de leitura/DOM; o botão não deve usar tabindex positivo (tabindex="-1" ou "0", conforme o controle focável do componente).

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. pressionar Tab 6 vezes a partir do topo do documento

Regra declarada: wcag:2.4.3

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(6)>div>button" — <button> "Selecione o arquivo" · **oculto**: aria-hidden

### Unidades candidatas (não são crédito)

- U-b3362afca6c4004dc1bfe74c6ea6d81e8a2e500a8eb931d94b772c90ee1746bd — A-02 · sempre · cena 1280x900 · <button> "Selecione o arquivo": Estrato K · variante tabindex-positivo. O botão do upload tem tabindex=1: o primeiro Tab da página cai nele, antes do atalho para o conteúdo e de todos os campos que o precedem no formulário. Sem predicado na referência (as espécies existentes medem ausência de atributo, não valor); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate (log de focusin): ["BUTTON#.upload-button.focus-visible[ti=1]", "A#.br-item...", "A#.marca-govbr...", "A#.br-button.circle...", "A#...", "SPAN#...[ti=0]"]` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: positiveTabindex = ["upload-button|1"]` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".upload-button",
    "relatedSelectors": [
      ".br-skiplink .br-item",
      "#nome"
    ],
    "rule": "wcag:2.4.3",
    "observed": "O botão de upload tem tabindex=\"1\" (único tabindex positivo da página). A partir do topo do documento, o primeiro Tab leva o foco para .upload-button, que fica no fim do formulário, antes do link \"Ir para o conteúdo\", da marca gov.br, do breadcrumb e de todos os campos.",
    "expected": "A ordem de foco deve seguir a ordem de leitura/DOM; o botão não deve usar tabindex positivo (tabindex=\"-1\" ou \"0\", conforme o controle focável do componente).",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "pressionar Tab 6 vezes a partir do topo do documento"
      ]
    },
    "evidence": [
      "browser_evaluate (log de focusin): [\"BUTTON#.upload-button.focus-visible[ti=1]\", \"A#.br-item...\", \"A#.marca-govbr...\", \"A#.br-button.circle...\", \"A#...\", \"SPAN#...[ti=0]\"]",
      "browser_evaluate: positiveTabindex = [\"upload-button|1\"]"
    ]
  },
  "scope": [
    "tela inteira /solicitacao.html: skiplink, cabeçalho, breadcrumb, formulário de solicitação (nome, CPF, dois selects br-select, grupo de rádios, datetimepicker, textarea, upload, grupo de checkboxes, declaração, ações), mensagens de retorno de envio, tabela \"Solicitações anteriores\" e paginação"
  ],
  "notes": "Sem oráculo de regras nesta execução: nenhuma ferramenta de consulta de regras, scan_page ou verificação heurística estava disponível; as atribuições usam wcag:<critério> apenas quando justificáveis e rule:null quando não. Interações realizadas: carga inicial e árvore de acessibilidade; Tab a partir do topo (13 paradas registradas por listener de focusin); abertura dos dois selects por mouse e por teclado (ArrowDown/Enter) com verificação de aria-expanded e valor; clique no rótulo \"Presencial\" e seleção do mesmo rádio por Espaço; envio do formulário vazio (mensagem \"Há 8 campo(s) obrigatório(s) sem preenchimento\", foco movido para o role=alert) e inspeção de aria-invalid/aria-describedby de todos os campos; fechamento da mensagem de erro pelo teclado (Enter no div role=button, funcionou); preenchimento completo e envio bem-sucedido; clique em \"Página 2\" da paginação; varredura de contraste de texto calculada em 1280x900 nos estados inicial e de erro (nenhuma reprovação); verificação de reflow em 320x640. Limitações e pontos incertos, não reportados como achados: (a) o papel combobox está no div .br-input e não no input focável (#servico/#unidade não expõem aria-expanded/aria-controls) — padrão do próprio design system, aplicabilidade incerta sem oráculo; (b) após escolher uma opção do select pelo teclado o foco vai para <body> em vez de voltar ao input; (c) o botão do calendário (#data-preferencial-btn) tem aria-hidden=\"true\" e tabindex=\"-1\", ficando indisponível a teclado e a leitores de tela, embora a data possa ser digitada; (d) em 320x640 a página rola horizontalmente (scrollWidth 545 vs clientWidth 305) por causa da tabela de solicitações anteriores, caso possivelmente coberto pela exceção de tabelas de dados do reflow; (e) a data \"30/02/2026\" digitada foi normalizada silenciosamente para \"02/03/2026\"; (f) a solicitação enviada com sucesso não passa a constar na tabela \"Solicitações anteriores\"; (g) o diálogo de seleção de arquivo não pôde ser exercido; (h) único erro de console é 404 de /favicon.ico. Todos os seletores enviados foram executados com document.querySelectorAll na página e resolvem para exatamente 1 elemento."
}
````

### Decisão

````json
{
  "cardId": "C-c75a5f2ad92060b8b10d5f1b4fe987aebe792dd985adb6331c2a18f0bc5288c2",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c7d69d23ba02b8eb01fad19955173e576b410fb7d7c1a15c0b0eea3e36b8035f

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O acionador de fechar da br-message de retorno é <div class="br-button circle small" role="button" tabindex="0" aria-label="Fechar a mensagem">, ou seja, a classe br-button aplicada a um <div>.

Esperado: br-button deve ser aplicado a <button>: nos exemplos canônicos message-padrao e message-inverted o fechar é <button class="br-button circle small" type="button" aria-label="...">.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em Enviar com o formulário vazio

Regra declarada: ds:ds-structure-button-tag

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(1)>div>div:nth-of-type(1)>div" — <div> "Fechar a mensagem"

### Unidades candidatas (não são crédito)

- U-1891342c11520896b9770ea0694cf80073cc0559489c26af1c1a3f9af0dedee1 — A-11 · apos-envio-vazio · cena 1280x900 · <div> "Não foi possível enviar. Há 8 campo(s) obrigatór": Estrato S · variante icone-e-fechar-trocados. Na mensagem de retorno o botão Fechar está à esquerda e o ícone semântico à direita — o inverso da anatomia do componente. Sem predicado na referência (nenhuma espécie mede posição); medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-bbfc7654327714d26fe1c4acef5b74dd3a8b5e541d8cd630d6ebc6f9d63f8fc0 — A-06 · apos-envio-vazio · cena 1280x900 · <div> "Fechar a mensagem": Estrato E · variante nativo-para-div. O botão Fechar da mensagem de retorno é um <div role="button" tabindex="0"> com tratadores de Enter e Espaço, no lugar do <button> nativo do exemplo oficial. Continua operável por teclado e nomeado — o defeito é só o elemento.
  - estados em que a unidade existe: apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: classe-no-elemento sustenta em apos-envio-vazio, dialogo-aberto — o próprio <div> carrega a classe .br-button. Medido: <div class="br-button circle small"> | <div class="br-button circle small">
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `govbr-ds-validator scan_page S-page-002 finding F-019 (ds-structure-button-tag, 'br-button aplicado a <div>', severity serious)` → identificador devolvido por ferramenta (sem arquivo)
- `govbr-ds-validator get_component_spec message → exemplos message-padrao e message-inverted usam <button class="br-button circle small" type="button">` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: seletor resolve 1 elemento, tagName DIV` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-retorno .close > div.br-button",
    "relatedSelectors": [
      ".mensagem-retorno"
    ],
    "rule": "ds:ds-structure-button-tag",
    "observed": "O acionador de fechar da br-message de retorno é <div class=\"br-button circle small\" role=\"button\" tabindex=\"0\" aria-label=\"Fechar a mensagem\">, ou seja, a classe br-button aplicada a um <div>.",
    "expected": "br-button deve ser aplicado a <button>: nos exemplos canônicos message-padrao e message-inverted o fechar é <button class=\"br-button circle small\" type=\"button\" aria-label=\"...\">.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em Enviar com o formulário vazio"
      ]
    },
    "evidence": [
      "govbr-ds-validator scan_page S-page-002 finding F-019 (ds-structure-button-tag, 'br-button aplicado a <div>', severity serious)",
      "govbr-ds-validator get_component_spec message → exemplos message-padrao e message-inverted usam <button class=\"br-button circle small\" type=\"button\">",
      "browser_evaluate: seletor resolve 1 elemento, tagName DIV"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-c7d69d23ba02b8eb01fad19955173e576b410fb7d7c1a15c0b0eea3e36b8035f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c86eec1d1811b5578e7fdd44d82937558605bf178be48ffe690316b324d07197

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Com o calendario aberto, o botao de proximo mes fica visivel (inline-flex, 32x32 px) e contem apenas <i class="fas fa-chevron-right">, sem texto, sem aria-label e sem title: o nome acessivel e vazio.

Esperado: aria-label descritivo no botao, por exemplo aria-label="Proximo mes".

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar no botao de calendario #data-preferencial-btn para abrir o flatpickr

Regra declarada: emag-2.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(2)>div:nth-of-type(1)>span:nth-of-type(2)>button" — <button> · **oculto**: nao-renderizado

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `scan S-page-001 finding F-009 (emag-2.2, serious)` → identificador devolvido por ferramenta (sem arquivo)
- `scan S-page-002 finding F-021` → identificador devolvido por ferramenta (sem arquivo)
- `DOM com calendario aberto: textContent='', aria-label=null, title='', 32x32 px` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": ".flatpickr-next-month button",
    "rule": "emag-2.2",
    "observed": "Com o calendario aberto, o botao de proximo mes fica visivel (inline-flex, 32x32 px) e contem apenas <i class=\"fas fa-chevron-right\">, sem texto, sem aria-label e sem title: o nome acessivel e vazio.",
    "expected": "aria-label descritivo no botao, por exemplo aria-label=\"Proximo mes\".",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar no botao de calendario #data-preferencial-btn para abrir o flatpickr"
      ]
    },
    "evidence": [
      "scan S-page-001 finding F-009 (emag-2.2, serious)",
      "scan S-page-002 finding F-021",
      "DOM com calendario aberto: textContent='', aria-label=null, title='', 32x32 px"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao, secao Solicitacoes anteriores (tabela + paginacao)",
    "estados: carga inicial, erro de validacao apos Enviar vazio, envio bem-sucedido, lista do br-select aberta, calendario do br-datetimepicker aberto"
  ],
  "notes": "Interacoes realizadas: carga inicial em 1280x900; snapshot da arvore de acessibilidade; tabulacao a partir de pagina recem-carregada (primeiro Tab); clique em Enviar com formulario vazio; foco e acionamento do botao de fechar da mensagem de erro com Enter e com Space (ambos funcionam e removem a mensagem); abertura da lista de #servico e de #unidade por ArrowDown e selecao por Enter (aria-expanded alterna corretamente e o foco vai para o primeiro br-item); Enter dentro de #servico dispara submissao implicita do formulario (comportamento nativo, nao tratado como defeito); preenchimento completo e envio bem-sucedido (mensagem br-message success, aria-invalid limpos, foco movido para .content[role=alert]); abertura do calendario pelo botao #data-preferencial-btn e inspecao dos controles de mes; leitura de CSS computado e de regras de origem para distinguir folha do @govbr-ds/core da folha da aplicacao. Varreduras do oraculo: S-page-001 (estado inicial, fingerprint sha256:fec51e82...) e S-page-002 (estado de erro, fingerprint sha256:d5b6611b...). Candidatos rejeitados e por que: (a) as 6 deteccoes ds-token-spacing/ds-token-radius (#descricao 6px, #servico e #unidade padding 29px, .br-list margin -2px, select do flatpickr) foram rejeitadas - verify_finding V-001 devolveu verdict=rejected, applicability=fail, 'verificacao deterministica sem norma nomeada nao produz achado' (D-27), e a inspecao de origem mostrou que todos esses valores vem da folha do proprio @govbr-ds/core (jsx-runtime-B-RTDNcS.css), nao da aplicacao; (b) ds-structure-button-tag no <a class='br-button circle'> do breadcrumb e no <div class='br-button' role='button'> do fechar da mensagem de erro - rejeitado por V-003 pelo mesmo motivo de ausencia de norma nomeada, e no caso do breadcrumb o exemplo canonico breadcrumb-default do proprio DS usa exatamente <a class='br-button circle'>; o div com role=button tem nome acessivel e responde a Enter e a Space, entao nao restou violacao normativa a citar; (c) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - coincide com os exemplos canonicos datetimepicker-simple/range/time do DS, rejeitado; (d) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos pagination-default/sizes/ellipsis tambem usam apenas a classe active e o oraculo nao expoe regra para isso: classificado como incerto e nao reportado; (e) ausencia de <ul>/<li> envolvendo os itens da paginacao e classes fora do vocabulario canonico (trilha-servico, acao-enviar, tabela-anteriores etc.) - o proprio oraculo as trata como observacao sem norma; (f) #servico mantem aria-invalid='true' e a mensagem de erro depois de a opcao ser escolhida (a limpeza so ocorre em nova submissao) - nao encontrei norma que exija revalidacao imediata, fica como incerto; (g) apos fechar a mensagem de erro o foco volta para <body> - incerto, nao reportado. Limitacoes: axe-core 4.12.1 rodou com 0 resultados incomplete e nenhuma violacao de contraste; emag-6.2, emag-6.3 e emag-2.2 nao tem predicado mecanico no oraculo (verify_finding V-002 e V-004 devolveram 'no-predicate' com ruleExists=pass, applicability=pass e evidenceConsistent=pass), de modo que esses achados se apoiam em inspecao direta do DOM, do CSS computado e da operacao por teclado, e nao em confirmacao mecanica; nao foi possivel exercitar o envio real de arquivo no input de upload; nao foram avaliados outros viewports alem de 1280x900."
}
````

### Decisão

````json
{
  "cardId": "C-c86eec1d1811b5578e7fdd44d82937558605bf178be48ffe690316b324d07197",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ce2d73239cb03c8c24270c7f20cf878b44f0d7d6785dbdbec7e7ab29a4d2d959

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: border-radius computado de 6px, fora da escala do DS. Os demais campos de entrada da mesma tela (#nome, #cpf, #servico, #unidade, #data-preferencial) computam 4px, e --surface-rounder-sm resolve para 4px no próprio #descricao.

Esperado: Raio de borda da escala do DS: 4px (--surface-rounder-sm / --input-radius), igual aos outros campos do formulário.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html

Regra declarada: ds:ds-token-radius

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(5)>div>textarea" — <textarea#descricao>

### Unidades candidatas (não são crédito)

Nenhuma âncora candidata; um achado novo correto continua sendo possível.

### Evidência da execução

- `govbr-ds-validator scan_page S-page-001 finding F-005 e S-page-002 finding F-016 (ds-token-radius, 'border-radius: 6px fora da escala do DS')` → identificador devolvido por ferramenta (sem arquivo)
- `govbr-ds-validator get_design_tokens query=radius → --input-radius: var(--surface-rounder-sm)` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: #descricao borderRadius=6px vs 4px em #nome/#cpf/#servico/#unidade/#data-preferencial; --surface-rounder-sm=4px` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#descricao",
    "rule": "ds:ds-token-radius",
    "observed": "border-radius computado de 6px, fora da escala do DS. Os demais campos de entrada da mesma tela (#nome, #cpf, #servico, #unidade, #data-preferencial) computam 4px, e --surface-rounder-sm resolve para 4px no próprio #descricao.",
    "expected": "Raio de borda da escala do DS: 4px (--surface-rounder-sm / --input-radius), igual aos outros campos do formulário.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html"
      ]
    },
    "evidence": [
      "govbr-ds-validator scan_page S-page-001 finding F-005 e S-page-002 finding F-016 (ds-token-radius, 'border-radius: 6px fora da escala do DS')",
      "govbr-ds-validator get_design_tokens query=radius → --input-radius: var(--surface-rounder-sm)",
      "browser_evaluate: #descricao borderRadius=6px vs 4px em #nome/#cpf/#servico/#unidade/#data-preferencial; --surface-rounder-sm=4px"
    ]
  },
  "scope": [
    "página inteira em http://127.0.0.1:3100/solicitacao.html",
    "skiplink, cabeçalho gov.br e breadcrumb",
    "formulário Solicitar serviço: estado inicial, estado de erro após envio vazio e estado de sucesso",
    "componentes br-select (Tipo de serviço, Unidade de atendimento) abertos por mouse e por teclado",
    "br-datetimepicker e o calendário flatpickr aberto",
    "br-upload, fieldsets de rádio e checkbox, br-message de retorno",
    "seção Solicitações anteriores: br-table e br-pagination (páginas 1 a 3)",
    "viewports 1280x900 e 375x812"
  ],
  "notes": "Interações executadas: carregamento e snapshot da árvore de acessibilidade; Tab a partir do topo do documento; envio do formulário vazio (estado de erro) e envio preenchido (estado de sucesso); abertura dos dois br-select por clique e por teclado (ArrowDown/Enter) com verificação de aria-expanded, valor e document.activeElement; abertura do calendário pelo botão do campo Data preferencial; clique no texto \"Presencial\" para testar a associação do rótulo; foco e acionamento por Enter/Espaço do fechar da br-message (funciona); navegação da paginação pelos links 1-3 e pelo botão \"Página seguinte\" (tabela e estados disabled corretos); redimensionamento para 375x812. Varreduras do oráculo: S-page-001 (estado inicial) e S-page-002 (estado de erro, via actions click .acao-enviar, compareToScanId=S-page-001); verify_finding V-001 para emag-6.6 em #servico (ruleExists=pass, applicability=pass, evidenceConsistent=pass, violation=no-predicate — o oráculo não tem predicado para emag-6.6, a evidência DOM foi conferida diretamente). Candidatos rejeitados: F-007/F-018 (br-button em <a> no item home do breadcrumb) foi rejeitado porque o próprio exemplo canônico breadcrumb-default do oráculo usa <a class=\"br-button circle\">; F-001/F-003/F-012/F-014 (padding 29px em #servico/#unidade), F-002/F-004/F-013/F-015 (margin -2px em .br-list) e F-006/F-017 (margin do <select> do flatpickr) foram rejeitados por serem valores internos e uniformes dos componentes br-select/flatpickr, não desvios autorais; F-023 (label-title-only) não foi repetido por ser o mesmo defeito de F-024. Incertezas declaradas, não reportadas como achados: a br-pagination não usa <ul>/<li> e a página ativa é indicada só por class=\"page active\" sem aria-current, mas o único constraint registrado para br-pagination é o de tag raiz e os exemplos canônicos também omitem aria-current; role=\"combobox\"/aria-expanded ficam no <div class=\"br-input\"> e não no input focalizável, o que diverge do padrão ARIA, mas corresponde ao comportamento do próprio br-select e não há regra no oráculo. Os achados de #cpf e #descricao saem com \"rule\": null: a falha é observada e reproduzível, mas não consegui justificar uma referência normativa exata (WCAG 3.3.1 exige identificar erro detectado, não exige detectá-lo). Limitações: o oráculo não tem predicado implementado para emag-6.6 nem para a perda de foco, então esses achados ficaram unverifiable no verify_finding e se apoiam em evidência DOM/comportamental direta; não foi possível enumerar as regras CSS de origem (document.styleSheets não retornou regras legíveis), então a atribuição autoral dos desvios de token foi feita por comparação entre elementos irmãos; nenhuma outra falha, timeout ou truncamento ocorreu."
}
````

### Decisão

````json
{
  "cardId": "C-ce2d73239cb03c8c24270c7f20cf878b44f0d7d6785dbdbec7e7ab29a4d2d959",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d57e5446867e2462f25f35694cd3d272871bd025713af71ef96e939d700183e5

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O rádio tem <label>Presencial</label> sem atributo for e sem aria-label/aria-labelledby: na árvore de acessibilidade aparece como "radio" sem nome. O rádio está com opacity:0 e coberto pelo rótulo, que intercepta o clique (Playwright: "<label>Presencial</label> intercepts pointer events"); clicar no texto "Presencial" deixa forma-presencial.checked === false. Só o teclado (foco + Espaço) marca a opção. Os outros dois rádios do grupo têm for="forma-video" e for="forma-telefone".

Esperado: O rádio deve ter nome acessível programático (label com for="forma-presencial") e o rótulo visível deve ativá-lo ao clique, como nas demais opções do grupo.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar no texto "Presencial" 3. focar #forma-presencial e pressionar Espaço

Regra declarada: wcag:4.1.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>fieldset:nth-of-type(1)>div:nth-of-type(1)>input" — <input#forma-presencial>

### Unidades candidatas (não são crédito)

- U-471fd34bfed8d491133fe60cfe6233aa00117fefb796768495ff7598fa7a6a5e — A-09 · sempre · cena 1280x900 · <input#forma-presencial>: Estrato S · variante label-sem-for, na primeira opção do grupo (convenção registrada em tela-a/construcao.md). O <label> de "Presencial" não tem for: o radio fica sem nome acessível e clicar no texto não o marca. As outras duas opções estão associadas.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: for, aria-label, aria-labelledby. Medido: ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `.playwright-mcp/page-2026-09-19T03-13-32-616Z.yml (snapshot: "radio [ref=e56]" sem nome, ao lado de "radio \"Por videochamada\"")` → não encontrado na evidência preservada da execução
- `.playwright-mcp/page-2026-09-19T03-17-35-298Z.yml (após clique no rótulo)` → não encontrado na evidência preservada da execução
- `browser_click ref=e56: TimeoutError com "<label>Presencial</label> intercepts pointer events"` → não encontrado na evidência preservada da execução
- `browser_evaluate: {presencial:false} após clique no rótulo; {presencial:true} após Espaço com foco no input` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#forma-presencial",
    "relatedSelectors": [
      ".grupo-forma .br-radio:first-of-type label"
    ],
    "rule": "wcag:4.1.2",
    "observed": "O rádio tem <label>Presencial</label> sem atributo for e sem aria-label/aria-labelledby: na árvore de acessibilidade aparece como \"radio\" sem nome. O rádio está com opacity:0 e coberto pelo rótulo, que intercepta o clique (Playwright: \"<label>Presencial</label> intercepts pointer events\"); clicar no texto \"Presencial\" deixa forma-presencial.checked === false. Só o teclado (foco + Espaço) marca a opção. Os outros dois rádios do grupo têm for=\"forma-video\" e for=\"forma-telefone\".",
    "expected": "O rádio deve ter nome acessível programático (label com for=\"forma-presencial\") e o rótulo visível deve ativá-lo ao clique, como nas demais opções do grupo.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar no texto \"Presencial\"",
        "focar #forma-presencial e pressionar Espaço"
      ]
    },
    "evidence": [
      ".playwright-mcp/page-2026-09-19T03-13-32-616Z.yml (snapshot: \"radio [ref=e56]\" sem nome, ao lado de \"radio \\\"Por videochamada\\\"\")",
      ".playwright-mcp/page-2026-09-19T03-17-35-298Z.yml (após clique no rótulo)",
      "browser_click ref=e56: TimeoutError com \"<label>Presencial</label> intercepts pointer events\"",
      "browser_evaluate: {presencial:false} após clique no rótulo; {presencial:true} após Espaço com foco no input"
    ]
  },
  "scope": [
    "tela inteira /solicitacao.html: skiplink, cabeçalho, breadcrumb, formulário de solicitação (nome, CPF, dois selects br-select, grupo de rádios, datetimepicker, textarea, upload, grupo de checkboxes, declaração, ações), mensagens de retorno de envio, tabela \"Solicitações anteriores\" e paginação"
  ],
  "notes": "Sem oráculo de regras nesta execução: nenhuma ferramenta de consulta de regras, scan_page ou verificação heurística estava disponível; as atribuições usam wcag:<critério> apenas quando justificáveis e rule:null quando não. Interações realizadas: carga inicial e árvore de acessibilidade; Tab a partir do topo (13 paradas registradas por listener de focusin); abertura dos dois selects por mouse e por teclado (ArrowDown/Enter) com verificação de aria-expanded e valor; clique no rótulo \"Presencial\" e seleção do mesmo rádio por Espaço; envio do formulário vazio (mensagem \"Há 8 campo(s) obrigatório(s) sem preenchimento\", foco movido para o role=alert) e inspeção de aria-invalid/aria-describedby de todos os campos; fechamento da mensagem de erro pelo teclado (Enter no div role=button, funcionou); preenchimento completo e envio bem-sucedido; clique em \"Página 2\" da paginação; varredura de contraste de texto calculada em 1280x900 nos estados inicial e de erro (nenhuma reprovação); verificação de reflow em 320x640. Limitações e pontos incertos, não reportados como achados: (a) o papel combobox está no div .br-input e não no input focável (#servico/#unidade não expõem aria-expanded/aria-controls) — padrão do próprio design system, aplicabilidade incerta sem oráculo; (b) após escolher uma opção do select pelo teclado o foco vai para <body> em vez de voltar ao input; (c) o botão do calendário (#data-preferencial-btn) tem aria-hidden=\"true\" e tabindex=\"-1\", ficando indisponível a teclado e a leitores de tela, embora a data possa ser digitada; (d) em 320x640 a página rola horizontalmente (scrollWidth 545 vs clientWidth 305) por causa da tabela de solicitações anteriores, caso possivelmente coberto pela exceção de tabelas de dados do reflow; (e) a data \"30/02/2026\" digitada foi normalizada silenciosamente para \"02/03/2026\"; (f) a solicitação enviada com sucesso não passa a constar na tabela \"Solicitações anteriores\"; (g) o diálogo de seleção de arquivo não pôde ser exercido; (h) único erro de console é 404 de /favicon.ico. Todos os seletores enviados foram executados com document.querySelectorAll na página e resolvem para exatamente 1 elemento."
}
````

### Decisão

````json
{
  "cardId": "C-d57e5446867e2462f25f35694cd3d272871bd025713af71ef96e939d700183e5",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-dca271e951cf685c60bdcf234c394df943f55521e23a1b70b18695b8b8c027dc

Estado: pendente

Contrato: determinístico — achado de uma linha de base da bateria, na janela do plano de estados; mesma contabilidade semântica do agente

Origem: linha de base determinística · cena 1280x900

Observado: color: rgb(51, 67, 51) (#334333) não corresponde a nenhum token do DS

Esperado: Valor de token do DS; mais próximo: --green-cool-70 (#37493b, distância RGB 10.77)

Janela: 1280×900 · interações desde o carregamento: 1. setup do plano de estados (4 passo(s))

Regra declarada: ds:token-color

Reuso: condicionado à mesma evidência verificada, estado declarado e build original.

### Sujeitos

- "body>div:nth-of-type(1)>div>div>div" — <div> "Descartar solicitação? Os dados preenchidos nest"

### Unidades candidatas (não são crédito)

- U-07d298f4df34c286740799c74d0ebada13b65d950a4b6ad514d6f6e090153e4d — A-03 · dialogo-aberto · cena 1280x900 · <div> "Descartar solicitação? Os dados preenchidos nest": Estrato T · variante cor-fora-da-paleta. O texto do diálogo usa #334333 — a cor de texto do DS (#333333) com o canal verde acrescido de 16 —, valor que não corresponde a token algum.
  - estados em que a unidade existe: dialogo-aberto
  - predicado de aceitação: estilo-computado sustenta em dialogo-aberto — alguma propriedade de [color] em {rgb(51, 67, 51)}. Medido: color=rgb(51, 67, 51)
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-f29a7aeeab28c9d4933141aff94ee3d84c368205c595930db83ceec28076ec77 — A-01 · dialogo-aberto · cena 1280x900 · <div> "Descartar solicitação? Os dados preenchidos nest": Estrato K · variante fecha-sem-devolver. Ao fechar o diálogo de descarte (X, Continuar preenchendo ou Esc) o foco não volta ao botão Cancelar que o abriu: cai em <body>. Abrir o diálogo leva o foco para dentro dele, como deve. Sem predicado na referência — o observável exige fechar o diálogo e ler document.activeElement; está medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#root > div > div > div",
    "rule": "ds:token-color",
    "observed": "color: rgb(51, 67, 51) (#334333) não corresponde a nenhum token do DS",
    "expected": "Valor de token do DS; mais próximo: --green-cool-70 (#37493b, distância RGB 10.77)",
    "scene": "1280x900",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "steps": [
      "setup do plano de estados (4 passo(s))"
    ]
  },
  "scope": [],
  "notes": null
}
````

### Decisão

````json
{
  "cardId": "C-dca271e951cf685c60bdcf234c394df943f55521e23a1b70b18695b8b8c027dc",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e3d8f816c2e5818c6de3d2c572b89f27c044430f508fddc171834880a34cf18e

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: Apos submeter o formulario vazio, os dois campos recebem aria-invalid="true" mas ficam com aria-describedby nulo, e os <span class="feedback danger retorno-campo" role="alert"> que carregam 'Selecione o tipo de servico.' e 'Selecione a unidade de atendimento.' nao possuem id, portanto nao ha como vincula-los. Todos os demais campos invalidos recebem o vinculo: #nome tem aria-describedby="nome-retorno", #cpf tem "cpf-apoio cpf-retorno", #data-preferencial tem "data-apoio data-retorno", #descricao tem "descricao-apoio descricao-retorno" e #declaracao tem "declaracao-retorno".

Esperado: A mensagem de erro deve ser vinculada ao campo que a originou por aria-describedby, alem de marcar aria-invalid="true", para que quem usa leitor de tela receba o motivo do erro ao voltar ao campo.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html 2. clicar em .acao-enviar com o formulario inteiramente vazio

Regra declarada: emag:6.6

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(1)>div>div:nth-of-type(1)>div>input" — <input#servico> "Selecione uma opção"
- "body>div:nth-of-type(1)>div>main>form>div:nth-of-type(3)>div:nth-of-type(2)>div>div:nth-of-type(1)>div>input" — <input#unidade> "Selecione uma opção"

### Unidades candidatas (não são crédito)

- U-27cc0d4a8e5df91ab64931d3374ec1ea9b51d3e9b519f740b3d4b3c1a6c195d8 — A-04 · sempre · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-51a6b48fcbf886149c29705242f258a4c46c4b607bc8f80c640a3e74faea8b16 — A-08 · apos-envio-vazio · cena 1280x900 · <input#unidade> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a10dcb076ad236543b32667bd7e0adfec72fef26085a4924a9eb55ecf74492e3 — A-08 · apos-envio-vazio · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato E · variante erro-sem-associacao · COMPARTILHADA pelos dois selects. Depois do envio vazio o texto de erro aparece sob o select, mas o campo não o referencia: não há aria-describedby. Os outros seis campos obrigatórios referenciam o próprio texto de erro. A unidade existe só neste estado, embora o campo exista desde o primeiro paint — por isso não é `conditional`.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: aria-describedby. Medido: ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby | ausentes: aria-describedby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.
- U-a4c4e6005ce86b914ed8b58011b3f8effcee1326c119327ddd4eb9e9e0540a41 — A-04 · sempre · cena 1280x900 · <input#servico> "Selecione uma opção": Estrato T · variante outline-none · COMPARTILHADA pelos dois selects. O campo de texto do select não mostra indicador de foco: a borda e o box-shadow com que o DS desenha o foco dos campos foram suprimidos (e o outline segue none). Nome, CPF, data e descrição mostram o indicador. Sem predicado na referência — o observável exige focar o elemento; medido em tela-a/conferir-construcao.mjs.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: não implementado — nada foi verificado por máquina aqui; a decisão é inteiramente sua
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `browser_evaluate apos clique em .acao-enviar: {servico:{desc:null, invalid:'true'}, unidade:{desc:null, invalid:'true'}, nome:{desc:'nome-retorno', invalid:'true'}}` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: .campo-servico .feedback e .campo-unidade .feedback com fbId = '' (sem id), outerHTML '<span class="feedback danger retorno-campo" role="alert">...'` → identificador devolvido por ferramenta (sem arquivo)
- `scan_page S-page-002 (estado pos-submissao, fingerprint sha256:43d8ed8abc5a582075fe93ee8d079db0ed811b0b5152513003f38955021be885)` → identificador devolvido por ferramenta (sem arquivo)

### Evidência declarada

````json
{
  "finding": {
    "selector": "#servico, #unidade",
    "relatedSelectors": [
      ".campo-servico .feedback",
      ".campo-unidade .feedback"
    ],
    "rule": "emag:6.6",
    "observed": "Apos submeter o formulario vazio, os dois campos recebem aria-invalid=\"true\" mas ficam com aria-describedby nulo, e os <span class=\"feedback danger retorno-campo\" role=\"alert\"> que carregam 'Selecione o tipo de servico.' e 'Selecione a unidade de atendimento.' nao possuem id, portanto nao ha como vincula-los. Todos os demais campos invalidos recebem o vinculo: #nome tem aria-describedby=\"nome-retorno\", #cpf tem \"cpf-apoio cpf-retorno\", #data-preferencial tem \"data-apoio data-retorno\", #descricao tem \"descricao-apoio descricao-retorno\" e #declaracao tem \"declaracao-retorno\".",
    "expected": "A mensagem de erro deve ser vinculada ao campo que a originou por aria-describedby, alem de marcar aria-invalid=\"true\", para que quem usa leitor de tela receba o motivo do erro ao voltar ao campo.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html",
        "clicar em .acao-enviar com o formulario inteiramente vazio"
      ]
    },
    "evidence": [
      "browser_evaluate apos clique em .acao-enviar: {servico:{desc:null, invalid:'true'}, unidade:{desc:null, invalid:'true'}, nome:{desc:'nome-retorno', invalid:'true'}}",
      "browser_evaluate: .campo-servico .feedback e .campo-unidade .feedback com fbId = '' (sem id), outerHTML '<span class=\"feedback danger retorno-campo\" role=\"alert\">...'",
      "scan_page S-page-002 (estado pos-submissao, fingerprint sha256:43d8ed8abc5a582075fe93ee8d079db0ed811b0b5152513003f38955021be885)"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao (nome, CPF, dois br-select, grupo de radio, datetimepicker, textarea, upload, checkboxes, declaracao, acoes), mensagem de retorno de validacao, tabela de solicitacoes anteriores e paginacao"
  ],
  "notes": "Viewport 1280x900. Interacoes executadas: submissao do formulario vazio via .acao-enviar (mensagem br-message danger + feedbacks por campo + aria-invalid + foco movido para .content[role=alert][tabindex=-1]); fechamento da mensagem pelo controle .close com Enter via teclado (funcionou, mensagem removida); abertura/fechamento do br-select 'Tipo de servico' por clique no botao data-trigger e por ArrowDown com foco no input (aria-expanded alterna corretamente em ambos); foco/clique em #data-preferencial (NAO abre o calendario) e clique em #data-preferencial-btn (abre); inspecao da arvore do calendario aberto; Tab unico a partir do carregamento (foco caiu em .upload-button, nao no skiplink); clique em 'Pagina 2' da paginacao (as linhas da tabela mudam e data-current vai para 2, funcional). Varreduras do oraculo: S-page-001 (estado inicial) e S-page-002 (apos clique em .acao-enviar, comparada por compareToScanId). CANDIDATOS REJEITADOS, com motivo: (a) ds-structure-button-tag sobre o <a class='br-button circle'> do breadcrumb - o exemplo canonico breadcrumb-default usa exatamente <a class='br-button circle'>, entao a marcacao esta conforme; (b) ds-structure-button-tag sobre o <div class='br-button' role='button'> do fechar-mensagem - diverge do exemplo canonico message-padrao, que usa <button>, e seria um achado plausivel, mas verify_finding rejeitou o id (D-27: 'ds-structure-button-tag nao declara qual regra normativa implementa'), e o protocolo proibe emprestar o id de outra norma para sustentar exigencia estrutural; alem disso confirmei por teclado que o controle e operavel com Enter; (c) todos os ds-token-spacing e ds-token-radius (padding 29px em #servico/#unidade, margin -2px nas .br-list, border-radius 6px em #descricao, margin do select do flatpickr) - verify_finding rejeitou ds-token-spacing e ds-token-radius pelo mesmo D-27; permanecem como observacoes de revisao, nao como achados, ainda que 6px em #descricao destoe dos 4px dos demais controles; (d) o F-017 do scanner alega escala violada mas reporta 'margin: 0px', valor que esta na escala - evidencia autocontraditoria; (e) label-title-only em #forma-presencial - mesmo defeito ja reportado sob e-MAG 6.2, nao repetido sob outra regra; (f) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - identico aos exemplos canonicos do datetimepicker, e o campo aceita digitacao com instrucao de formato, entao ha alternativa de entrada; (g) <span tabindex='0' aria-current='page'> do breadcrumb - presente literalmente no exemplo canonico; (h) papel combobox no wrapper .br-input e opcoes como radio dentro de .br-list - padrao canonico do br-select, e verifiquei que e operavel por teclado; (i) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos de paginacao tambem nao usam aria-current, sem norma para sustentar; (j) erro de console 404 de /favicon.ico - irrelevante para conformidade. LIMITACOES: avaliei apenas o viewport 1280x900, sem checagem responsiva em larguras menores; nao testei leitor de tela real, apenas a arvore de acessibilidade e atributos ARIA; nao exercitei o upload de arquivo real nem uma submissao valida completa ate o estado de sucesso, entao o estado de sucesso do formulario nao foi avaliado; os ids das .br-list sao gerados aleatoriamente a cada carga, por isso nenhum seletor deste relatorio depende deles; os achados 4, 5 e 6 estao na marcacao do flatpickr embutido no componente datetimepicker, e nao no codigo proprio da tela, mas integram a interface entregue."
}
````

### Decisão

````json
{
  "cardId": "C-e3d8f816c2e5818c6de3d2c572b89f27c044430f508fddc171834880a34cf18e",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f33e069975b8c0adeb572753d49d02eb564731161ce428a572116bc2d67f57dc

Estado: pendente

Contrato: achado-2 — observado, esperado, estado e evidência declarados pelo agente

Origem: execução do agente · cena 1280x900

Observado: O <label>Presencial</label> irmao nao tem atributo for, e o input nao tem aria-label nem aria-labelledby, portanto seu nome acessivel e vazio. Os outros dois radios do mesmo fieldset usam label[for=forma-video] e label[for=forma-telefone] e sao expostos corretamente.

Esperado: Todo campo de formulario deve ter rotulo associado programaticamente, por <label for="forma-presencial">, aria-label ou aria-labelledby.

Janela: 1280×900 · interações desde o carregamento: 1. carregar http://127.0.0.1:3100/solicitacao.html

Regra declarada: emag:6.2

Reuso: restrito à execução de origem; evidência/estado/build insuficientes para equivalência entre execuções.

### Sujeitos

- "body>div:nth-of-type(1)>div>main>form>fieldset:nth-of-type(1)>div:nth-of-type(1)>input" — <input#forma-presencial>

### Unidades candidatas (não são crédito)

- U-471fd34bfed8d491133fe60cfe6233aa00117fefb796768495ff7598fa7a6a5e — A-09 · sempre · cena 1280x900 · <input#forma-presencial>: Estrato S · variante label-sem-for, na primeira opção do grupo (convenção registrada em tela-a/construcao.md). O <label> de "Presencial" não tem for: o radio fica sem nome acessível e clicar no texto não o marca. As outras duas opções estão associadas.
  - estados em que a unidade existe: inicial, apos-envio-vazio, dialogo-aberto
  - predicado de aceitação: atributos-ausentes sustenta em inicial, apos-envio-vazio, dialogo-aberto — nenhum destes atributos presente: for, aria-label, aria-labelledby. Medido: ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby | ausentes: for, aria-label, aria-labelledby
  - o predicado prova que o DEFEITO está na página; que esta alegação o afirme é decisão sua.

### Evidência da execução

- `scan_page S-page-001 finding F-011 (axe-core 'label', critical, locator #forma-presencial)` → identificador devolvido por ferramenta (sem arquivo)
- `scan_page S-page-002 finding F-024 (mesma regra, estado pos-submissao)` → identificador devolvido por ferramenta (sem arquivo)
- `browser_snapshot: 'radio [ref=e56]' sem nome acessivel, enquanto e59 expoe 'Por videochamada' e e62 expoe 'Por telefone'` → identificador devolvido por ferramenta (sem arquivo)
- `browser_evaluate: parentElement.outerHTML = '<div class="br-radio"><input id="forma-presencial" type="radio" value="presencial" name="forma"><label>Presencial</label></div>'` → não encontrado na evidência preservada da execução

### Evidência declarada

````json
{
  "finding": {
    "selector": "#forma-presencial",
    "relatedSelectors": [
      "#forma-presencial ~ label"
    ],
    "rule": "emag:6.2",
    "observed": "O <label>Presencial</label> irmao nao tem atributo for, e o input nao tem aria-label nem aria-labelledby, portanto seu nome acessivel e vazio. Os outros dois radios do mesmo fieldset usam label[for=forma-video] e label[for=forma-telefone] e sao expostos corretamente.",
    "expected": "Todo campo de formulario deve ter rotulo associado programaticamente, por <label for=\"forma-presencial\">, aria-label ou aria-labelledby.",
    "state": {
      "viewport": {
        "width": 1280,
        "height": 900
      },
      "steps": [
        "carregar http://127.0.0.1:3100/solicitacao.html"
      ]
    },
    "evidence": [
      "scan_page S-page-001 finding F-011 (axe-core 'label', critical, locator #forma-presencial)",
      "scan_page S-page-002 finding F-024 (mesma regra, estado pos-submissao)",
      "browser_snapshot: 'radio [ref=e56]' sem nome acessivel, enquanto e59 expoe 'Por videochamada' e e62 expoe 'Por telefone'",
      "browser_evaluate: parentElement.outerHTML = '<div class=\"br-radio\"><input id=\"forma-presencial\" type=\"radio\" value=\"presencial\" name=\"forma\"><label>Presencial</label></div>'"
    ]
  },
  "scope": [
    "tela inteira de solicitacao.html: skiplink, cabecalho, breadcrumb, formulario de solicitacao (nome, CPF, dois br-select, grupo de radio, datetimepicker, textarea, upload, checkboxes, declaracao, acoes), mensagem de retorno de validacao, tabela de solicitacoes anteriores e paginacao"
  ],
  "notes": "Viewport 1280x900. Interacoes executadas: submissao do formulario vazio via .acao-enviar (mensagem br-message danger + feedbacks por campo + aria-invalid + foco movido para .content[role=alert][tabindex=-1]); fechamento da mensagem pelo controle .close com Enter via teclado (funcionou, mensagem removida); abertura/fechamento do br-select 'Tipo de servico' por clique no botao data-trigger e por ArrowDown com foco no input (aria-expanded alterna corretamente em ambos); foco/clique em #data-preferencial (NAO abre o calendario) e clique em #data-preferencial-btn (abre); inspecao da arvore do calendario aberto; Tab unico a partir do carregamento (foco caiu em .upload-button, nao no skiplink); clique em 'Pagina 2' da paginacao (as linhas da tabela mudam e data-current vai para 2, funcional). Varreduras do oraculo: S-page-001 (estado inicial) e S-page-002 (apos clique em .acao-enviar, comparada por compareToScanId). CANDIDATOS REJEITADOS, com motivo: (a) ds-structure-button-tag sobre o <a class='br-button circle'> do breadcrumb - o exemplo canonico breadcrumb-default usa exatamente <a class='br-button circle'>, entao a marcacao esta conforme; (b) ds-structure-button-tag sobre o <div class='br-button' role='button'> do fechar-mensagem - diverge do exemplo canonico message-padrao, que usa <button>, e seria um achado plausivel, mas verify_finding rejeitou o id (D-27: 'ds-structure-button-tag nao declara qual regra normativa implementa'), e o protocolo proibe emprestar o id de outra norma para sustentar exigencia estrutural; alem disso confirmei por teclado que o controle e operavel com Enter; (c) todos os ds-token-spacing e ds-token-radius (padding 29px em #servico/#unidade, margin -2px nas .br-list, border-radius 6px em #descricao, margin do select do flatpickr) - verify_finding rejeitou ds-token-spacing e ds-token-radius pelo mesmo D-27; permanecem como observacoes de revisao, nao como achados, ainda que 6px em #descricao destoe dos 4px dos demais controles; (d) o F-017 do scanner alega escala violada mas reporta 'margin: 0px', valor que esta na escala - evidencia autocontraditoria; (e) label-title-only em #forma-presencial - mesmo defeito ja reportado sob e-MAG 6.2, nao repetido sob outra regra; (f) #data-preferencial-btn com aria-hidden='true' e tabindex='-1' - identico aos exemplos canonicos do datetimepicker, e o campo aceita digitacao com instrucao de formato, entao ha alternativa de entrada; (g) <span tabindex='0' aria-current='page'> do breadcrumb - presente literalmente no exemplo canonico; (h) papel combobox no wrapper .br-input e opcoes como radio dentro de .br-list - padrao canonico do br-select, e verifiquei que e operavel por teclado; (i) ausencia de aria-current='page' no <a class='page active'> da paginacao - os exemplos canonicos de paginacao tambem nao usam aria-current, sem norma para sustentar; (j) erro de console 404 de /favicon.ico - irrelevante para conformidade. LIMITACOES: avaliei apenas o viewport 1280x900, sem checagem responsiva em larguras menores; nao testei leitor de tela real, apenas a arvore de acessibilidade e atributos ARIA; nao exercitei o upload de arquivo real nem uma submissao valida completa ate o estado de sucesso, entao o estado de sucesso do formulario nao foi avaliado; os ids das .br-list sao gerados aleatoriamente a cada carga, por isso nenhum seletor deste relatorio depende deles; os achados 4, 5 e 6 estao na marcacao do flatpickr embutido no componente datetimepicker, e nao no codigo proprio da tela, mas integram a interface entregue."
}
````

### Decisão

````json
{
  "cardId": "C-f33e069975b8c0adeb572753d49d02eb564731161ce428a572116bc2d67f57dc",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````
