# Case matrix — curation table (Phase 4.1, D-12)

> Generated 2026-07-12 by `scripts/case-matrix.ts` from the validator KB (82 candidates
> = force required|prohibited ∧ automatable ∧ automationConfidence high, of 186 KB rules).
> **Curation notes (Phase 4.2):** pick target cases per stratum, balance mechanisms and knowledge
> categories, give every violation case a conformant twin, add false-positive traps. The
> `suggested category` column is a heuristic — adjust freely. Record the frozen matrix in
> `thesis-workspace/tcc2-decisions-log.md`.
> Per-tool expected detections are NOT part of this table: they get *measured* (D-06).


## dom (33)

| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |
|---|---|---|---|---|---|---|---|
| ☐ | `govbr-3.7.0-accessibility-global-1cb2c878824b` | — | required | serious | emag-specific | Use elementos HTML conforme seu significado e organize o documento em ordem lógica. | Elementos semânticos correspondem ao propósito do conteúdo.; A ordem do DOM é compreensível sem CSS. |
| ☐ | `govbr-3.7.0-accessibility-global-3ac0aaa53900` | — | required | serious | emag-specific | Estruture títulos de H1 a H6 hierarquicamente; prefira um único H1 para o conteúdo principal. | Não há saltos ilógicos de hierarquia.; O H1 identifica o conteúdo principal. |
| ☐ | `govbr-3.7.0-accessibility-global-7d2b85f81c52` | — | required | critical | emag-specific | Forneça atalhos para blocos relevantes e faça do salto para o conteúdo o primeiro link da página. | O primeiro link focável leva ao conteúdo principal.; Existem destinos válidos para conteúdo, menu e busca quando aplicáveis. |
| ☐ | `govbr-3.7.0-accessibility-global-206c9fa6ae11` | — | required | serious | emag-specific | Use tabelas apenas para dados tabulares; faça a diagramação com CSS. | Elementos table representam dados, não layout. |
| ☐ | `govbr-3.7.0-accessibility-global-bfba9c1f5026` | — | required | serious | emag-specific | Divida a página em regiões gerenciáveis e mantenha uma organização consistente entre páginas internas. | Regiões como topo, menu, conteúdo e rodapé são identificáveis.; Páginas internas mantêm estrutura consistente. |
| ☐ | `govbr-3.7.0-accessibility-global-698e0a4783a9` | — | required | serious | emag-specific | Declare o idioma principal em todas as páginas com o atributo lang. | O elemento html possui lang válido. |
| ☐ | `govbr-3.7.0-accessibility-global-1ccbc61dddbc` | — | required | critical | emag-specific | Use th para cabeçalhos, td para dados e associe corretamente cabeçalhos e células. | Cabeçalhos são identificáveis.; Associações permanecem corretas em tabelas complexas. |
| ☐ | `govbr-3.7.0-accessibility-global-1db13803cbf8` | — | required | moderate | emag-specific | Marque com lang trechos cujo idioma difere do idioma principal. | Trechos em idioma diferente possuem lang adequado. |
| ☐ | `govbr-3.7.0-accessibility-global-5d5a5f21d94b` | — | required | serious | emag-specific | Defina um title descritivo que represente o conteúdo principal e identifique o sítio ou sistema. | O elemento title existe.; O título descreve o assunto principal.; Páginas internas identificam também o sítio ou sistema. |
| ☐ | `govbr-3.7.0-accessibility-global-75c11ccac582` | — | required | moderate | emag-specific | Forneça um mecanismo de orientação, como breadcrumb hierárquico, que indique a localização atual. | Breadcrumb ou mecanismo equivalente existe.; A página atual não é apresentada como link.; Itens anteriores são navegáveis. |
| ☐ | `govbr-3.7.0-accessibility-global-3a3e47354c53` | — | required | critical | emag-specific | Forneça texto alternativo apropriado ao contexto para imagens informativas. | Imagens informativas possuem alt significativo.; Imagens decorativas são tratadas de forma apropriada. |
| ☐ | `govbr-3.7.0-accessibility-global-609e3494150c` | — | required | serious | emag-specific | Quando mapa de imagem for indispensável, forneça alt para cada área ativa e não o utilize como menu ou seletor de regiões. | Cada area possui alt.; Mapa de imagem não substitui menu ou seleção regional. |
| ☐ | `govbr-3.7.0-accessibility-global-dafac812b10b` | — | required | critical | emag-specific | Botões de imagem devem possuir nome textual acessível, usando alt ou valor descritivo conforme o tipo. | Input type=image possui alt.; Botões estilizados por imagem preservam valor ou nome acessível. |
| ☐ | `govbr-3.7.0-accessibility-global-b95c42b61ed3` | — | required | critical | emag-specific | Associe label aos campos input, select e textarea usando for e id correspondentes. | Cada campo possui label programaticamente associado. |
| ☐ | `govbr-3.7.0-accessibility-global-de1efebaf255` | — | required | serious | emag-specific | Receber foco ou alterar um campo não deve mudar automaticamente o contexto; exija ação explícita. | Foco não dispara navegação.; Mudanças relevantes exigem botão ou confirmação. |
| ☐ | `govbr-3.7.0-accessibility-global-01b1806c30e9` | — | required | serious | emag-specific | Forneça instruções de preenchimento junto aos rótulos quando o formato ou a regra de entrada não for evidente. | Campos com formato específico possuem instrução.; Campos obrigatórios são indicados textualmente. |
| ☐ | `govbr-3.7.0-accessibility-global-cc837bbaf713` | — | required | critical | emag-specific | Identifique erros por texto, associe-os aos campos e apresente confirmação para revisão antes do envio definitivo. | Erros são descritos textualmente.; O foco retorna ao resumo ou campo com erro.; O usuário pode revisar e editar antes do envio. |
| ☐ | `govbr-3.7.0-accessibility-global-11ffc5c577f6` | — | required | moderate | emag-specific | Agrupe campos relacionados com fieldset e descreva o grupo com legend, especialmente em formulários longos. | Campos relacionados compartilham fieldset.; Legend explica o propósito do grupo. |
| ☐ | `govbr-3.7.0-accessibility-global-b5fad7ce076d` | — | required | critical | compositional | Associe um label programático e descritivo a cada campo de formulário. | Cada input, select e textarea possui nome acessível.; O label descreve a finalidade do campo. |
| ☐ | `govbr-3.7.0-accessibility-global-cb56ad444da2` | — | required | critical | compositional | A ordem dos elementos no DOM deve acompanhar a sequência lógica de leitura e operação. | A sequência do DOM faz sentido sem reposicionamento visual.; A ordem de foco acompanha a ordem de leitura. |
| ☐ | `govbr-3.7.0-accessibility-global-2f22b7245ef9` | — | required | serious | compositional | Use elementos HTML de acordo com sua função semântica, evitando div e span quando existir elemento nativo adequado. | Controles usam elementos nativos quando disponíveis.; A estrutura permanece compreensível sem CSS. |
| ☐ | `govbr-3.7.0-component-global-e30aab6e9a68` | — | required | serious | compositional | A anatomia implementada do componente deve corresponder à diretriz oficial de Design. | Estrutura, elementos e relações correspondem à anatomia documentada. |
| ☐ | `govbr-3.7.0-pattern-global-03695a4aede0` | — | required | moderate | ds-pattern | Apresente o Empty State no lugar dos elementos ou dados que estão ausentes. | A ausência não deixa uma região vazia sem explicação. |
| ☐ | `govbr-3.7.0-pattern-global-eebb093156e7` | — | required | moderate | ds-pattern | Use toda a área de destaque como acionador do Collapse e inclua o ícone de expansão ou retração. | Toda a área de destaque é clicável.; Há ícone que comunica o estado de expansão. |
| ☐ | `govbr-3.7.0-component-button-4d7b5f978df1` | button | required | serious | structural | O Button deve possuir rótulo visível, exceto na variante circular. | Botão não circular contém texto visível.; Botão circular é identificado por outro mecanismo acessível. |
| ☐ | `govbr-3.7.0-component-item-739294d90299` | item | prohibited | serious | structural | Não coloque Button primário nem componentes de navegação dentro da área de conteúdo do Item. | A área de conteúdo não contém controles de navegação proibidos. |
| ☐ | `govbr-3.7.0-component-item-cb34ed616246` | item | required | serious | structural | Todo Item deve possuir uma superfície e uma área de conteúdo com pelo menos um elemento. | Existe container .br-item.; O container possui conteúdo interno significativo. |
| ☐ | `govbr-3.7.0-component-item-a6d29ea54434` | item | required | moderate | structural | Quando o Item for interativo, toda a sua superfície deve constituir a área acionável e apresentar hover. | A superfície completa responde à interação.; O estado hover é perceptível. |
| ☐ | `govbr-3.7.0-component-message-66b01a712e67` | message | required | moderate | structural | Posicione o ícone semântico à esquerda e o botão Fechar no topo à direita da Message. | Ícone semântico no lado esquerdo.; Botão Fechar no topo direito. |
| ☐ | `govbr-3.7.0-accessibility-skiplink-5aae226482e5` | skiplink | required | critical | structural | O Skip Link deve ser o primeiro conteúdo focável após a abertura de body. | Skip Link aparece imediatamente após body.; É o primeiro elemento alcançado por Tab. |
| ☐ | `govbr-3.7.0-component-table-7c605ca2f85e` | table | required | critical | structural | Toda Table deve possuir ao menos uma coluna. | A tabela possui pelo menos uma célula de cabeçalho/coluna. |
| ☐ | `govbr-3.7.0-component-upload-985fd2775586` | upload | required | serious | structural | Upload deve aceitar arrastar arquivos e informar essa possibilidade no texto de apoio do campo. | Existe uma zona de arrastar e soltar.; O texto de apoio informa a interação por arraste. |
| ☐ | `govbr-3.7.0-component-wizard-356c3bf376a5` | wizard | required | moderate | structural | Na última etapa do Wizard, apresente uma ação denominada Concluir. | A última etapa contém um botão cujo rótulo é Concluir. |

## keyboard-interaction (16)

| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |
|---|---|---|---|---|---|---|---|
| ☐ | `govbr-3.7.0-accessibility-global-79db88c7f55d` | — | required | critical | emag-specific | A ordem do DOM deve produzir uma sequência lógica de leitura e foco; use tabindex apenas quando indispensável. | A ordem de foco acompanha a leitura.; Tabindex positivo não cria sequência artificial. |
| ☐ | `govbr-3.7.0-accessibility-global-5be1f553cc03` | — | required | serious | emag-specific | Não abra automaticamente novas abas, janelas ou modais; quando necessário, informe previamente o usuário e preserve o foco. | Links não forçam nova janela sem aviso.; Modais recebem foco e permitem retorno por teclado. |
| ☐ | `govbr-3.7.0-accessibility-global-e6fd5e1247de` | — | required | critical | emag-specific | Todas as funções devem ser operáveis por teclado, sem aprisionamento de foco. | Todas as ações possuem equivalente de teclado.; O foco percorre todos os elementos e pode sair deles. |
| ☐ | `govbr-3.7.0-accessibility-global-f639993e9416` | — | required | critical | emag-specific | Scripts, conteúdo dinâmico e objetos programáveis devem funcionar com teclado e oferecer alternativa acessível quando necessário. | Conteúdo dinâmico é operável por teclado.; Interações de arrastar possuem alternativa.; Scripts inacessíveis têm alternativa equivalente. |
| ☐ | `govbr-3.7.0-accessibility-global-33b13d9fa271` | — | required | serious | emag-specific | Conteúdo em movimento não deve iniciar sem controle; ofereça pausar, parar e reiniciar. | Controles de pausa e retomada são acessíveis.; Movimento automático pode ser interrompido. |
| ☐ | `govbr-3.7.0-accessibility-global-56cbcba602ce` | — | required | serious | emag-specific | Ofereça controles para parar, pausar, silenciar ou ajustar o volume de sons reproduzidos na página. | Áudio possui controles acessíveis de pausa, parada ou volume. |
| ☐ | `govbr-3.7.0-accessibility-global-6ea7ecc60c01` | — | required | serious | emag-specific | Animações iniciadas automaticamente devem poder ser pausadas, paradas ou ocultadas. | Animação automática possui controle acessível. |
| ☐ | `govbr-3.7.0-accessibility-global-e101928665cc` | — | required | serious | emag-specific | Codifique formulários primeiro na ordem lógica de navegação e só depois organize sua aparência com CSS. | A ordem de foco segue a ordem lógica dos campos.; Tabindex é usado apenas quando indispensável. |
| ☐ | `govbr-3.7.0-accessibility-global-41850b4791b8` | — | required | critical | compositional | Todo componente interativo deve ser completamente utilizável apenas com teclado. | Todas as funções são acessíveis sem mouse. |
| ☐ | `govbr-3.7.0-accessibility-breadcrumb-992f162ca821` | breadcrumb | required | serious | structural | Elementos interativos do Breadcrumb devem ser alcançáveis com Tab. | Cada link interativo recebe foco por Tab. |
| ☐ | `govbr-3.7.0-accessibility-card-e7fa6a659cdf` | card | required | serious | structural | Elementos interativos do Card devem ser navegáveis com Tab. | Elementos interativos do Card recebem foco por Tab. |
| ☐ | `govbr-3.7.0-accessibility-input-6fe41e804955` | input | required | serious | structural | Cada Input deve ser alcançável pela tecla Tab e ocupar um ponto coerente na ordem de foco. | Cada input recebe foco por Tab.; A ordem de foco acompanha a ordem lógica da interface. |
| ☐ | `govbr-3.7.0-accessibility-list-03813ffeeb42` | list | required | serious | structural | Elementos interativos da List devem permitir navegação com Tab e Shift+Tab. | Itens interativos entram e saem da ordem de foco corretamente. |
| ☐ | `govbr-3.7.0-accessibility-modal-64b84991229c` | modal | required | critical | structural | A Modal deve permitir navegação interna com Tab e Shift+Tab. | Tab avança entre controles.; Shift+Tab retrocede.; Foco permanece coerente com a Modal aberta. |
| ☐ | `govbr-3.7.0-accessibility-notification-2bae7736ddda` | notification | required | serious | structural | O painel de Notification deve permitir avanço com Tab e retorno com Shift+Tab. | Tab avança.; Shift+Tab retrocede.; Ordem de foco lógica. |
| ☐ | `govbr-3.7.0-accessibility-tab-f1807d71dc5f` | tab | required | serious | structural | Tabs devem ser acessíveis e navegáveis inteiramente por teclado. | Foco alcança a lista de tabs.; Navegação e seleção funcionam sem mouse. |

## source-code (14)

| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |
|---|---|---|---|---|---|---|---|
| ☐ | `govbr-3.7.0-accessibility-global-7e6420514860` | — | required | serious | emag-specific | Mantenha HTML, CSS e JavaScript em camadas adequadas e siga padrões Web interoperáveis. | Código válido e interoperável.; Conteúdo, apresentação e comportamento permanecem separados. |
| ☐ | `govbr-3.7.0-accessibility-global-cd5de9a6f164` | — | required | serious | emag-specific | Não atualize a página periodicamente sem controle; ofereça ação explícita e informe casos em que a atualização for indispensável. | Não existe meta refresh periódico.; Existe controle explícito para atualizar o conteúdo. |
| ☐ | `govbr-3.7.0-accessibility-global-d6e816588306` | — | required | serious | emag-specific | Não redirecione páginas com meta refresh; faça o redirecionamento no servidor. | Não existe meta http-equiv=refresh para redirecionamento. |
| ☐ | `govbr-3.7.0-accessibility-global-3a57435c3b32` | — | required | serious | emag-specific | Prefira HTML; documentos ODF devem ser acessíveis e PDFs devem possuir alternativa em HTML ou ODF. | Documentos são oferecidos em HTML quando possível.; PDF possui alternativa acessível em HTML ou ODF. |
| ☐ | `govbr-3.7.0-development-global-a43ad8231ad0` | — | required | moderate | compositional | Carregue fontes e bibliotecas externas exigidas antes dos arquivos do Design System. | Dependências de fonte e ícones são carregadas antes dos assets do DS. |
| ☐ | `govbr-3.7.0-development-global-137c50bea6ca` | — | required | serious | compositional | Componentes devem consumir tokens oficiais corretamente e sem duplicação desnecessária. | Valores de design mapeiam para tokens oficiais.; Tokens são reutilizados em vez de duplicados. |
| ☐ | `govbr-3.7.0-development-global-659242ecda1d` | — | required | minor | compositional | Use a anotação @example para documentar exemplos de uso de recursos Sass. | Recursos Sass reutilizáveis possuem exemplo quando necessário. |
| ☐ | `govbr-3.7.0-development-global-5765f1b8d2bc` | — | required | minor | compositional | Documente o tipo e a descrição de cada parâmetro de mixins e funções Sass. | Parâmetros Sass possuem tipo e descrição documentados. |
| ☐ | `govbr-3.7.0-development-global-9c1d24af4f37` | — | required | serious | compositional | Inicialize componentes somente depois que core.min.js estiver carregado. | A inicialização ocorre após o carregamento do bundle oficial. |
| ☐ | `govbr-3.7.0-development-global-d0dff372c137` | — | required | serious | compositional | Quando um componente depender de outro, inicialize primeiro suas dependências. | A ordem de inicialização respeita o grafo de dependências. |
| ☐ | `govbr-3.7.0-development-global-0052d80d4f92` | — | required | moderate | compositional | Em frameworks, destrua ou limpe instâncias de componentes durante o desmonte. | Hooks de desmontagem removem listeners e instâncias. |
| ☐ | `govbr-3.7.0-development-global-9826b6862644` | — | required | minor | compositional | Não declare atributos redundantes de tipo ou linguagem em elementos script no HTML5. | Elementos script não usam type ou language quando desnecessários no HTML5. |
| ☐ | `govbr-3.7.0-development-global-dfebe85e65d8` | — | required | moderate | compositional | Componentes devem possuir testes funcionais e testes de regressão visual. | Existe suíte funcional.; Existe cenário de regressão visual. |
| ☐ | `govbr-3.7.0-development-global-b491c2e2c1a0` | — | required | minor | compositional | Escreva valores de atributos HTML entre aspas duplas. | Atributos HTML usam aspas duplas de forma consistente. |

## computed-style (10)

| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |
|---|---|---|---|---|---|---|---|
| ☐ | `govbr-3.7.0-development-global-406774b1cb87` | — | required | moderate | token | Utilize Rawline como fonte oficial do Governo Federal. | font-family computado inclui Rawline quando disponível. |
| ☐ | `govbr-3.7.0-foundation-global-0578aa6c2828` | — | required | moderate | token | A Grid utiliza espaçamento de 40 px entre colunas. | column-gap ou gutter equivalente a 40 px. |
| ☐ | `govbr-3.7.0-foundation-global-21b1a2733f7b` | — | required | serious | token | Interfaces governamentais devem usar as cores predefinidas do Design System. | Cores computadas mapeiam para tokens ou valores oficiais. |
| ☐ | `govbr-3.7.0-foundation-global-1c0146e93d2e` | — | required | serious | token | Ícones interativos devem possuir área de toque de 48 × 48 px. | Bounding box ou área clicável mínima de 48 × 48 CSS pixels. |
| ☐ | `govbr-3.7.0-accessibility-global-cb09bc0c77c0` | — | required | critical | emag-specific | Garanta contraste de pelo menos 4,5:1 entre texto e fundo e evite imagens atrás do texto. | Contraste calculado igual ou superior a 4,5:1.; Texto não depende de fundo visual que prejudique leitura. |
| ☐ | `govbr-3.7.0-accessibility-global-21fbcc2fe37b` | — | required | critical | emag-specific | Todo elemento focado por teclado deve possuir indicação visual clara e área acionável coerente. | Focus indicator é perceptível.; A área de foco corresponde à área clicável. |
| ☐ | `govbr-3.7.0-component-avatar-81c7524692f0` | avatar | required | moderate | token | A representação do usuário no Avatar deve estar contida em superfície circular. | Forma circular.; border-radius compatível com círculo. |
| ☐ | `govbr-3.7.0-component-item-a10751502b98` | item | required | moderate | token | O conteúdo do Item deve respeitar o padding definido pelos fundamentos de espaçamento. | O padding computado corresponde à escala oficial. |
| ☐ | `govbr-3.7.0-component-list-8f67e7cc7677` | list | prohibited | moderate | token | Todos os itens de uma mesma List devem utilizar espaçamento consistente. | Os espaçamentos equivalentes entre itens possuem o mesmo valor computado. |
| ☐ | `govbr-3.7.0-component-signin-2752fd23bbe8` | signin | prohibited | moderate | token | Não use quebra de linha no rótulo do Sign-in. | Rótulo renderizado em uma única linha. |

## visual (4)

| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |
|---|---|---|---|---|---|---|---|
| ☐ | `govbr-3.7.0-accessibility-global-8faca42c2c9a` | — | required | critical | emag-specific | Não use efeitos piscantes, intermitentes ou cintilantes, inclusive em conteúdo de terceiros. | Não há intermitência capaz de provocar risco fotossensível. |
| ☐ | `govbr-3.7.0-accessibility-global-d9c42f188e2c` | — | required | critical | emag-specific | A página deve permanecer legível e funcional com zoom de 200%, sem sobreposição ou rolagem horizontal indevida. | Zoom de 200% preserva conteúdo e controles.; Não há sobreposição ou corte funcional. |
| ☐ | `govbr-3.7.0-pattern-global-9d9f1c9bf1ed` | — | prohibited | serious | ds-pattern | Não trunque cabeçalhos, títulos, menus, rótulos de botões, erros ou mensagens de validação. | Conteúdo crítico permanece integralmente visível ou acessível. |
| ☐ | `govbr-3.7.0-template-global-9cbfa5906031` | — | required | serious | ds-pattern | A tela de erro deve adaptar seu conteúdo à Grid do breakpoint atual. | O conteúdo se ajusta às grids documentadas sem corte ou sobreposição. |

## semantic (2)

| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |
|---|---|---|---|---|---|---|---|
| ☐ | `govbr-3.7.0-accessibility-global-6c86b93df639` | — | required | critical | emag-specific | Vídeos devem possuir alternativa textual ou sonora, legendas quando houver fala e controles acessíveis por teclado. | Vídeo sem áudio possui descrição textual ou sonora.; Vídeo falado possui legenda.; Player é operável por teclado. |
| ☐ | `govbr-3.7.0-accessibility-global-dc45b57b8349` | — | required | critical | emag-specific | Conteúdo de áudio deve possuir transcrição textual e, quando aplicável, alternativa em Libras. | Áudio possui transcrição.; Controles do player são acessíveis. |

## accessibility-tree (2)

| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |
|---|---|---|---|---|---|---|---|
| ☐ | `govbr-3.7.0-accessibility-global-e038367bd7d6` | — | required | critical | compositional | Associe cada widget customizado ao role, estado e propriedade ARIA apropriados ao seu comportamento. | O role representa o tipo real do elemento.; Estados e propriedades ARIA refletem o estado atual do componente. |
| ☐ | `govbr-3.7.0-accessibility-divider-30bbcbf3a17c` | divider | required | serious | structural | Divider deve ser ignorado por tecnologias assistivas e não pode entrar na ordem de foco. | Divider não possui tabindex focável.; Elemento decorativo não é anunciado como conteúdo significativo. |

## responsive-viewport (1)

| pick | KB rule id | component | force | sev | suggested category | rule | expected evidence |
|---|---|---|---|---|---|---|---|
| ☐ | `govbr-3.7.0-accessibility-global-1c3bd2a1c1a7` | — | required | serious | compositional | Componentes devem permanecer utilizáveis em dispositivos móveis. | Interações funcionam em viewport móvel e entrada por toque. |
