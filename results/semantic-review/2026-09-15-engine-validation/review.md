# Revisão semântica — pacote fechado

Versão: flow-semantic-1.0.0 · 30 cartões únicos · 30 pendentes

Este pacote inclui todas as alegações selecionadas, inclusive as que casariam por regra.
Candidatos são sugestões de âncora, não vereditos. Você continua sendo a adjudicadora.
Edite reviews.json; depois gere uma NOVA saída com score. Não edite package.json.

As capturas scene-* são reconstruções no momento de preparar o pacote, não prova de que o agente observou o mesmo estado.
Confira também reportedEvidence, inclusive as limitações declaradas. Use unresolved quando não houver suporte.

Um átomo = um defeito. subjects identifica cada elemento alegado; unitIds contém somente alternativas semanticamente aceitas.
Cada átomo/elemento vale no máximo uma detecção. Divida alegações compostas; contabilize também as partes falsas.

## C-07db2b02bdde2bd26725a617d219a826a8e68ba6db94d892b1dea40175e95632

Estado: pendente

Ao enviar com CPF vazio, aparece o parágrafo 'Informe um CPF para continuar.' sem role=alert/status nem aria-live, e o foco não é movido até ele (fica no botão ou no campo). Leitores de tela não anunciam a mensagem.

Regra declarada: wcag:4.1.3

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf"
    ],
    "rule": "wcag:4.1.3",
    "description": "Ao enviar com CPF vazio, aparece o parágrafo 'Informe um CPF para continuar.' sem role=alert/status nem aria-live, e o foco não é movido até ele (fica no botão ou no campo). Leitores de tela não anunciam a mensagem."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, estado de erro com CPF vazio, envio com CPF '123'",
    "lista de outras opções de identificação",
    "links de ajuda e termo de uso"
  ],
  "notes": "Sem oráculo nem scan_page; ids WCAG atribuídos manualmente. Interações: snapshot da árvore de acessibilidade e leitura de DOM/estilos/regras CSS; clique em Continuar com CPF vazio (mensagem 'Informe um CPF para continuar.' aparece, foco fica no botão, sem aria-invalid/aria-describedby/live region); Enter no campo vazio (mesmo resultado, foco no campo); envio de '123' (mensagem some, nenhuma validação nem navegação — não reportado, pois nenhum erro é detectado); clique em Alto Contraste e VLibras (nenhuma mudança observável de DOM/estilo além de hover; registrado como incerto e não reportado, pois o contraste padrão já atende ao 1.4.3); Tab a partir de Continuar até 'Login com seu banco' (:focus-visible verdadeiro, outline none e box-shadow none, sem indicador visual, confirmado por screenshot). Contrastes verificados e aprovados: selo branco sobre #168821 (~4.6:1), texto #555, links #1351b4, borda do campo #888 (~3.5:1), mensagem de erro #e60000 (~4.8:1). Alvos dos links de opção têm 20px de altura, mas passam no 2.5.8 pela exceção de espaçamento. Frase institucional em <p> com 24px, usada como rótulo da região: rejeitada como cabeçalho visual obrigatório (atribuição incerta). O seletor .mensagem-erro-cpf só existe após enviar com CPF vazio; verificado nesse estado. Console: 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-07db2b02bdde2bd26725a617d219a826a8e68ba6db94d892b1dea40175e95632",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-10f0afbb8f096d687d90b78c2714cb914f87e6a4abe5590a7d7382a33ce83b1a

Estado: pendente

Os 4 links de 'Outras opções de identificação' não mostram indicador de foco: com :focus-visible via teclado, outline-style permanece none, sem box-shadow, fundo, sublinhado ou mudança no .br-item pai ou pseudo-elementos. Os demais controles têm outline tracejado de 4px.

Regra declarada: wcag:2.4.7

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0214a63cac8b37f735b733c8ff64ccb9aa5d8ac4f74d7304e796dc17f235a647 — V-05 · sempre · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-5479553fe575f98d640713f178fb5e5b97b26268192a2196454c2ab7fefdb056 — V-05 · sempre · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-6dd43a541fcfe205e97a759af59c9678d07c611e5bc2791c1f6e8ece7486992c — V-05 · sempre · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-81b4c283e2666b5e474bfc31a3177c003b3fa07709e29bb72061625bd4d248f2 — V-05 · sempre · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.

### Evidência declarada

````json
{
  "finding": {
    "selector": "a.link-opcao",
    "relatedSelectors": [],
    "rule": "wcag:2.4.7",
    "description": "Os 4 links de 'Outras opções de identificação' não mostram indicador de foco: com :focus-visible via teclado, outline-style permanece none, sem box-shadow, fundo, sublinhado ou mudança no .br-item pai ou pseudo-elementos. Os demais controles têm outline tracejado de 4px."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Sem oráculo/scan_page: avaliação manual via árvore de acessibilidade, DOM e estilos computados. Interações: Tab e foco por teclado em todos os controles (comparação de outline/box-shadow/fundo/sublinhado com e sem :focus-visible, incluindo item pai e pseudo-elementos); envio vazio (clique em Continuar) -> surge p.mensagem-erro-cpf, foco permanece no botão, sem live region nem aria-invalid/aria-describedby; envio de '123' com Enter -> mensagem some e nada acontece (sem validação de formato observável; incerto, não reportado); clique em Alto Contraste -> nenhuma mudança observável (sem classes, cores ou aria-pressed; possível controle não funcional de protótipo, sem id normativo justificável, não reportado); clique em VLibras -> nenhum widget/diálogo aparece (não reportado); viewport 320x800 -> rolagem horizontal (scrollWidth 447 vs 305) com botão VLibras fora da tela. Contraste de textos calculado: todos >= 4.5:1 (tag PRATA 4.59:1 a 11px; erro rgb(230,0,0) ~4.8:1). Rejeitados: nome acessível da marca contém texto visível (2.5.3 ok); alvos de 20px de altura nos links de opção com espaçamento suficiente (2.5.8 ok); títulos h1/h2 coerentes; lang pt-BR e title presentes. Incerto: ausência de link de salto (eMAG 1.5) com main presente e só 3 controles no cabeçalho, não reportado. Seletores conferidos com querySelectorAll; p.mensagem-erro-cpf só existe após envio vazio. Console: 404 de favicon.ico apenas."
}
````

### Decisão

````json
{
  "cardId": "C-10f0afbb8f096d687d90b78c2714cb914f87e6a4abe5590a7d7382a33ce83b1a",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-1cd09e96cdf43b074fa8990bf48408f9dc575279014e8feb85b86c55f3535551

Estado: pendente

Os 4 links de 'Outras opções de identificação' não têm indicador de foco visível: com :focus-visible ativo, outline permanece 'none', sem box-shadow, borda, mudança de cor/fundo/sublinhado, nem estilo em ::before/::after ou no item pai (.br-item). Os demais controles mostram outline tracejado de 4px. Também corresponde a eMAG 4.4.

Regra declarada: wcag:2.4.7

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0214a63cac8b37f735b733c8ff64ccb9aa5d8ac4f74d7304e796dc17f235a647 — V-05 · sempre · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-5479553fe575f98d640713f178fb5e5b97b26268192a2196454c2ab7fefdb056 — V-05 · sempre · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-6dd43a541fcfe205e97a759af59c9678d07c611e5bc2791c1f6e8ece7486992c — V-05 · sempre · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-81b4c283e2666b5e474bfc31a3177c003b3fa07709e29bb72061625bd4d248f2 — V-05 · sempre · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.

### Evidência declarada

````json
{
  "finding": {
    "selector": "a.link-opcao",
    "relatedSelectors": [],
    "rule": "wcag:2.4.7",
    "description": "Os 4 links de 'Outras opções de identificação' não têm indicador de foco visível: com :focus-visible ativo, outline permanece 'none', sem box-shadow, borda, mudança de cor/fundo/sublinhado, nem estilo em ::before/::after ou no item pai (.br-item). Os demais controles mostram outline tracejado de 4px. Também corresponde a eMAG 4.4."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda e termo"
  ],
  "notes": "Oráculo/scan_page indisponível; avaliação manual via Playwright (árvore de acessibilidade, DOM, estilos computados). Interações: Tab e foco em todos os controles (verificação de :focus-visible, outline, box-shadow, borda, fundo, sublinhado, pseudo-elementos e :focus-within do item pai); cálculo de contraste de todos os textos (todos >= 4.5:1, incl. mensagem de erro ~4.8:1 e selo 4.59:1); geometria de alvos (links de 20px com espaçamento suficiente — 2.5.8 rejeitado); envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece, foco permanece no botão); envio com '123' via Enter (mensagem some, sem validação de formato); clique em Alto Contraste e VLibras. Incertos não reportados: Alto Contraste e VLibras não produzem efeito observável (sem classe, aria-pressed, widget ou mudança de cores) — pode ser stub de protótipo; ausência de links de salto (eMAG 1.5) numa página com poucos controles antes do conteúdo; seção institucional nomeada por parágrafo longo via aria-labelledby. O seletor p.mensagem-erro-cpf só resolve no estado de erro (após enviar CPF vazio); foi conferido nesse estado (1 elemento). Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-1cd09e96cdf43b074fa8990bf48408f9dc575279014e8feb85b86c55f3535551",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-3c0f08fe347008bc9e9df8118bc940de2972557623320dda41f681f82c6f4d73

Estado: pendente

Os 4 br-item da lista de opções usam padding 13px (var(--item-padding) = 13px), fora da escala de espaçamento do DS (múltiplos de 4px, base 8px) (F-002 a F-005).

Regra declarada: govbr-3.7.0-development-global-137c50bea6ca

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-067f7b63fee64feef4dcf116feaf3226179d467059a00df6c7a3a2f13c03d20b — V-01 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-0a06d6c2666c52e5b5faea905342062b43505697aca1d40aaf8d21105dbf8b65 — V-06 · sempre · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-27d684611e863628a335eede61b151de50a847894eab9921d65b6232ce920497 — V-01 · sempre · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-50a41c9954db67f6251c43958960c5b7cc0691ec75ecb0d6f9b86d01b54d79cc — V-06 · sempre · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-6eca513e1c652d02d6c85982c332e4e1dff7d28373af26c2a88e4a148ce06dd3 — V-06 · sempre · <div> "Seu certificado digital em nuvem": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-7cc34f81b7938fc55f42db552b8c9ea3a3197fbc3f1f929564a0e3fc301bdb83 — V-01 · sempre · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-9ef8bc6f8cecdfcbc1d2095a7c3dbbba3aeb77219b849989a4de003d9c761b17 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-c0bb76ed1336638ddf8b824bde0c1214cbcfa404ae5bae82ffac1092dc9af1a9 — V-04 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
- U-cfd5477878c854c2d4e0935ac91d731ed6b16c81bcfd8f253b1eacce6d27460b — V-01 · sempre · <div> "Seu certificado digital em nuvem": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes > .opcao-identificacao",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-development-global-137c50bea6ca",
    "description": "Os 4 br-item da lista de opções usam padding 13px (var(--item-padding) = 13px), fora da escala de espaçamento do DS (múltiplos de 4px, base 8px) (F-002 a F-005)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro vazio, CPF '123'), lista de outras opções, links de ajuda e termo"
  ],
  "notes": "Interações: snapshot e DOM inicial; scan_page completo (S-page-001); envio vazio por clique em Continuar (mensagem 'Informe um CPF para continuar.' surge) com scan comparado (S-page-002, só fingerprint mudou) e scan de tokens escopado a textos/seções/mensagem (S-page-003); preenchimento '123' + Enter (mensagem some, nada acontece, sem feedback); navegação por Tab do campo ao botão (foco visível, outline tracejado) e ao primeiro link de opção (sem indicador); clique em Alto Contraste (nenhuma mudança observável, sem aria-pressed). axe: 36 passes, 0 violações. Rejeitados: contraste da tag PRATA (branco/#168821 ≈4,6:1), <hr> br-divider com role=presentation, classes utilitárias extras e tamanhos de fonte 11px/16px (oráculo sem norma). Incertos, não reportados: ausência de instrução de formato do CPF antes do campo (eMAG 6.5); CPF inválido '123' aceito sem mensagem (não se sabe se há validação automática, 3.3.1 só se aplica a erro detectado); botão Alto Contraste sem efeito visível; border #dee2e6 está a distância RGB 4,24 de --gray-cool-10. Limitações: .mensagem-erro-cpf só existe após enviar o formulário vazio; VLibras não acionado; links de opção apontam para /fluxo e não foram seguidos; console só com 404 de favicon; viewport padrão, sem teste responsivo."
}
````

### Decisão

````json
{
  "cardId": "C-3c0f08fe347008bc9e9df8118bc940de2972557623320dda41f681f82c6f4d73",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-479bbd5b8306a9decf137dbb8e5a5d4f8a4c1aacd8cd394e3354c6d5ded0d9f3

Estado: pendente

A mensagem de erro inserida após clicar em Continuar não tem role=alert/status nem aria-live, e o foco fica no botão. Leitores de tela não a anunciam. Só existe no estado de erro (após envio com CPF vazio).

Regra declarada: wcag:4.1.3

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": "p.mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf"
    ],
    "rule": "wcag:4.1.3",
    "description": "A mensagem de erro inserida após clicar em Continuar não tem role=alert/status nem aria-live, e o foco fica no botão. Leitores de tela não a anunciam. Só existe no estado de erro (após envio com CPF vazio)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Sem oráculo/scan_page: avaliação manual via árvore de acessibilidade, DOM e estilos computados. Interações: Tab e foco por teclado em todos os controles (comparação de outline/box-shadow/fundo/sublinhado com e sem :focus-visible, incluindo item pai e pseudo-elementos); envio vazio (clique em Continuar) -> surge p.mensagem-erro-cpf, foco permanece no botão, sem live region nem aria-invalid/aria-describedby; envio de '123' com Enter -> mensagem some e nada acontece (sem validação de formato observável; incerto, não reportado); clique em Alto Contraste -> nenhuma mudança observável (sem classes, cores ou aria-pressed; possível controle não funcional de protótipo, sem id normativo justificável, não reportado); clique em VLibras -> nenhum widget/diálogo aparece (não reportado); viewport 320x800 -> rolagem horizontal (scrollWidth 447 vs 305) com botão VLibras fora da tela. Contraste de textos calculado: todos >= 4.5:1 (tag PRATA 4.59:1 a 11px; erro rgb(230,0,0) ~4.8:1). Rejeitados: nome acessível da marca contém texto visível (2.5.3 ok); alvos de 20px de altura nos links de opção com espaçamento suficiente (2.5.8 ok); títulos h1/h2 coerentes; lang pt-BR e title presentes. Incerto: ausência de link de salto (eMAG 1.5) com main presente e só 3 controles no cabeçalho, não reportado. Seletores conferidos com querySelectorAll; p.mensagem-erro-cpf só existe após envio vazio. Console: 404 de favicon.ico apenas."
}
````

### Decisão

````json
{
  "cardId": "C-479bbd5b8306a9decf137dbb8e5a5d4f8a4c1aacd8cd394e3354c6d5ded0d9f3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-57befc97f596d22b95fb8d7a65f83d259d27fde334e269e164cf2fdc8131d4c0

Estado: pendente

Mensagem de erro (estado após envio vazio) usa color rgb(230,0,0) #e60000, declarada literalmente, que não é token do DS; o mais próximo é --red-vivid-50 #e52207 (scan S-page-003, F-014).

Regra declarada: govbr-3.7.0-foundation-global-21b1a2733f7b

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-foundation-global-21b1a2733f7b",
    "description": "Mensagem de erro (estado após envio vazio) usa color rgb(230,0,0) #e60000, declarada literalmente, que não é token do DS; o mais próximo é --red-vivid-50 #e52207 (scan S-page-003, F-014)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro vazio, CPF '123'), lista de outras opções, links de ajuda e termo"
  ],
  "notes": "Interações: snapshot e DOM inicial; scan_page completo (S-page-001); envio vazio por clique em Continuar (mensagem 'Informe um CPF para continuar.' surge) com scan comparado (S-page-002, só fingerprint mudou) e scan de tokens escopado a textos/seções/mensagem (S-page-003); preenchimento '123' + Enter (mensagem some, nada acontece, sem feedback); navegação por Tab do campo ao botão (foco visível, outline tracejado) e ao primeiro link de opção (sem indicador); clique em Alto Contraste (nenhuma mudança observável, sem aria-pressed). axe: 36 passes, 0 violações. Rejeitados: contraste da tag PRATA (branco/#168821 ≈4,6:1), <hr> br-divider com role=presentation, classes utilitárias extras e tamanhos de fonte 11px/16px (oráculo sem norma). Incertos, não reportados: ausência de instrução de formato do CPF antes do campo (eMAG 6.5); CPF inválido '123' aceito sem mensagem (não se sabe se há validação automática, 3.3.1 só se aplica a erro detectado); botão Alto Contraste sem efeito visível; border #dee2e6 está a distância RGB 4,24 de --gray-cool-10. Limitações: .mensagem-erro-cpf só existe após enviar o formulário vazio; VLibras não acionado; links de opção apontam para /fluxo e não foram seguidos; console só com 404 de favicon; viewport padrão, sem teste responsivo."
}
````

### Decisão

````json
{
  "cardId": "C-57befc97f596d22b95fb8d7a65f83d259d27fde334e269e164cf2fdc8131d4c0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-5e5ff9aee6837c751abad0211fb3c598fa2c4bd464de108484481cb375b60c83

Estado: pendente

A mensagem de erro é inserida dinamicamente após o envio sem role=alert, aria-live ou movimentação de foco (foco permanece em 'Continuar'), portanto não é anunciada por tecnologias assistivas. Seletor resolve somente no estado de erro.

Regra declarada: wcag:4.1.3

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": "p.mensagem-erro-cpf",
    "relatedSelectors": [
      "#cpf",
      "button.acao-continuar"
    ],
    "rule": "wcag:4.1.3",
    "description": "A mensagem de erro é inserida dinamicamente após o envio sem role=alert, aria-live ou movimentação de foco (foco permanece em 'Continuar'), portanto não é anunciada por tecnologias assistivas. Seletor resolve somente no estado de erro."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda e termo"
  ],
  "notes": "Oráculo/scan_page indisponível; avaliação manual via Playwright (árvore de acessibilidade, DOM, estilos computados). Interações: Tab e foco em todos os controles (verificação de :focus-visible, outline, box-shadow, borda, fundo, sublinhado, pseudo-elementos e :focus-within do item pai); cálculo de contraste de todos os textos (todos >= 4.5:1, incl. mensagem de erro ~4.8:1 e selo 4.59:1); geometria de alvos (links de 20px com espaçamento suficiente — 2.5.8 rejeitado); envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece, foco permanece no botão); envio com '123' via Enter (mensagem some, sem validação de formato); clique em Alto Contraste e VLibras. Incertos não reportados: Alto Contraste e VLibras não produzem efeito observável (sem classe, aria-pressed, widget ou mudança de cores) — pode ser stub de protótipo; ausência de links de salto (eMAG 1.5) numa página com poucos controles antes do conteúdo; seção institucional nomeada por parágrafo longo via aria-labelledby. O seletor p.mensagem-erro-cpf só resolve no estado de erro (após enviar CPF vazio); foi conferido nesse estado (1 elemento). Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-5e5ff9aee6837c751abad0211fb3c598fa2c4bd464de108484481cb375b60c83",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-685b241ee66e280a5f69ef706fae18c5c71f700d70af0e6bb3c676e54ce405d2

Estado: pendente

Após envio vazio, a mensagem 'Informe um CPF para continuar.' aparece só visualmente: o input não recebe aria-invalid nem aria-describedby, e a borda do campo não muda (rgb(136,136,136)). A relação erro–campo não é determinável por programa.

Regra declarada: wcag:1.3.1

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      "p.mensagem-erro-cpf"
    ],
    "rule": "wcag:1.3.1",
    "description": "Após envio vazio, a mensagem 'Informe um CPF para continuar.' aparece só visualmente: o input não recebe aria-invalid nem aria-describedby, e a borda do campo não muda (rgb(136,136,136)). A relação erro–campo não é determinável por programa."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Sem oráculo/scan_page: avaliação manual via árvore de acessibilidade, DOM e estilos computados. Interações: Tab e foco por teclado em todos os controles (comparação de outline/box-shadow/fundo/sublinhado com e sem :focus-visible, incluindo item pai e pseudo-elementos); envio vazio (clique em Continuar) -> surge p.mensagem-erro-cpf, foco permanece no botão, sem live region nem aria-invalid/aria-describedby; envio de '123' com Enter -> mensagem some e nada acontece (sem validação de formato observável; incerto, não reportado); clique em Alto Contraste -> nenhuma mudança observável (sem classes, cores ou aria-pressed; possível controle não funcional de protótipo, sem id normativo justificável, não reportado); clique em VLibras -> nenhum widget/diálogo aparece (não reportado); viewport 320x800 -> rolagem horizontal (scrollWidth 447 vs 305) com botão VLibras fora da tela. Contraste de textos calculado: todos >= 4.5:1 (tag PRATA 4.59:1 a 11px; erro rgb(230,0,0) ~4.8:1). Rejeitados: nome acessível da marca contém texto visível (2.5.3 ok); alvos de 20px de altura nos links de opção com espaçamento suficiente (2.5.8 ok); títulos h1/h2 coerentes; lang pt-BR e title presentes. Incerto: ausência de link de salto (eMAG 1.5) com main presente e só 3 controles no cabeçalho, não reportado. Seletores conferidos com querySelectorAll; p.mensagem-erro-cpf só existe após envio vazio. Console: 404 de favicon.ico apenas."
}
````

### Decisão

````json
{
  "cardId": "C-685b241ee66e280a5f69ef706fae18c5c71f700d70af0e6bb3c676e54ce405d2",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-73ea876b59056fcd163a71e8498d8a4358ffa13be1158bd2839cb71b8f8b0236

Estado: pendente

No estado de erro, o campo CPF não recebe aria-invalid nem aria-describedby/aria-errormessage apontando para a mensagem 'Informe um CPF para continuar.'. A relação campo–erro fica só visual, não programática.

Regra declarada: wcag:1.3.1

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "wcag:1.3.1",
    "description": "No estado de erro, o campo CPF não recebe aria-invalid nem aria-describedby/aria-errormessage apontando para a mensagem 'Informe um CPF para continuar.'. A relação campo–erro fica só visual, não programática."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, estado de erro com CPF vazio, envio com CPF '123'",
    "lista de outras opções de identificação",
    "links de ajuda e termo de uso"
  ],
  "notes": "Sem oráculo nem scan_page; ids WCAG atribuídos manualmente. Interações: snapshot da árvore de acessibilidade e leitura de DOM/estilos/regras CSS; clique em Continuar com CPF vazio (mensagem 'Informe um CPF para continuar.' aparece, foco fica no botão, sem aria-invalid/aria-describedby/live region); Enter no campo vazio (mesmo resultado, foco no campo); envio de '123' (mensagem some, nenhuma validação nem navegação — não reportado, pois nenhum erro é detectado); clique em Alto Contraste e VLibras (nenhuma mudança observável de DOM/estilo além de hover; registrado como incerto e não reportado, pois o contraste padrão já atende ao 1.4.3); Tab a partir de Continuar até 'Login com seu banco' (:focus-visible verdadeiro, outline none e box-shadow none, sem indicador visual, confirmado por screenshot). Contrastes verificados e aprovados: selo branco sobre #168821 (~4.6:1), texto #555, links #1351b4, borda do campo #888 (~3.5:1), mensagem de erro #e60000 (~4.8:1). Alvos dos links de opção têm 20px de altura, mas passam no 2.5.8 pela exceção de espaçamento. Frase institucional em <p> com 24px, usada como rótulo da região: rejeitada como cabeçalho visual obrigatório (atribuição incerta). O seletor .mensagem-erro-cpf só existe após enviar com CPF vazio; verificado nesse estado. Console: 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-73ea876b59056fcd163a71e8498d8a4358ffa13be1158bd2839cb71b8f8b0236",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-748805a7ef383c6103750091c527b22adbc7ed81d993eea48582b79828192928

Estado: pendente

A mensagem de erro (visível após envio vazio) usa color #e60000, que não é token da paleta do DS. O mais próximo é --red-vivid-50 #e52207 (F-008).

Regra declarada: govbr-3.7.0-foundation-global-21b1a2733f7b

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-foundation-global-21b1a2733f7b",
    "description": "A mensagem de erro (visível após envio vazio) usa color #e60000, que não é token da paleta do DS. O mais próximo é --red-vivid-50 #e52207 (F-008)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro de envio vazio, envio com '123')",
    "lista de outras opções de identificação",
    "links de ajuda e termo"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; inspeção de DOM, estilos computados e folhas de estilo da aplicação; scan_page S-page-001 (estado inicial, axe+structure+tokens), S-page-002 (após envio vazio, axe+structure, compareTo S-page-001), S-page-003/004 (tokens no formulário e em .mensagem-erro-cpf/#cpf no estado de erro), S-page-005 (tokens de cor em painéis, barra e itens). Envio vazio pelo botão Continuar: surge p.mensagem-erro-cpf ('Informe um CPF para continuar.'), sem aria-invalid, sem aria-describedby, sem região viva e o foco permanece no botão. Envio de '123' via Enter: a mensagem some e nada mais acontece (formato de CPF não validado; sem regra normativa específica, ficou como incerto e não foi reportado). Tab a partir do botão levou ao link 'Login com seu banco', que tem :focus-visible e nenhuma indicação visual (a regra .link-opcao:focus remove outline e box-shadow). Clique em 'Alto Contraste': sem mudança observável (classes e fundo inalterados, nenhum aria-pressed); sem regra específica, ficou como incerto. Observações do oráculo não promovidas a achado: classes utilitárias extras, hr.br-divider (semântica nativa preservada, role=presentation), font-size 11px na tag (sem norma). A cor #dee2e6 também aparece em border-bottom de .barra-superior e .opcao-identificacao, mas o oráculo não a sinalizou nesses elementos (S-page-005); ficou como incerto e não foi reportado. Limitações: o seletor .mensagem-erro-cpf só existe depois do envio vazio; axe sem violações (36 passes); console só tem 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-748805a7ef383c6103750091c527b22adbc7ed81d993eea48582b79828192928",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-74cffa7a4715026fc34e7270313cd33e313079a4afc243f066f037b42e49a6c1

Estado: pendente

Ao enviar vazio, a mensagem 'Informe um CPF para continuar.' é inserida como <p> sem id, fora do wrapper br-input, e não é associada ao campo: #cpf não recebe aria-invalid nem aria-describedby, a mensagem não tem role=alert/aria-live, o foco fica no botão e o campo não recebe estado danger (eMAG 6.6 / WCAG 3.3.1, 4.1.3). Seletor relacionado existe somente no estado de erro.

Regra declarada: govbr-3.7.0-accessibility-global-cc837bbaf713

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "govbr-3.7.0-accessibility-global-cc837bbaf713",
    "description": "Ao enviar vazio, a mensagem 'Informe um CPF para continuar.' é inserida como <p> sem id, fora do wrapper br-input, e não é associada ao campo: #cpf não recebe aria-invalid nem aria-describedby, a mensagem não tem role=alert/aria-live, o foco fica no botão e o campo não recebe estado danger (eMAG 6.6 / WCAG 3.3.1, 4.1.3). Seletor relacionado existe somente no estado de erro."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro vazio, CPF '123'), lista de outras opções, links de ajuda e termo"
  ],
  "notes": "Interações: snapshot e DOM inicial; scan_page completo (S-page-001); envio vazio por clique em Continuar (mensagem 'Informe um CPF para continuar.' surge) com scan comparado (S-page-002, só fingerprint mudou) e scan de tokens escopado a textos/seções/mensagem (S-page-003); preenchimento '123' + Enter (mensagem some, nada acontece, sem feedback); navegação por Tab do campo ao botão (foco visível, outline tracejado) e ao primeiro link de opção (sem indicador); clique em Alto Contraste (nenhuma mudança observável, sem aria-pressed). axe: 36 passes, 0 violações. Rejeitados: contraste da tag PRATA (branco/#168821 ≈4,6:1), <hr> br-divider com role=presentation, classes utilitárias extras e tamanhos de fonte 11px/16px (oráculo sem norma). Incertos, não reportados: ausência de instrução de formato do CPF antes do campo (eMAG 6.5); CPF inválido '123' aceito sem mensagem (não se sabe se há validação automática, 3.3.1 só se aplica a erro detectado); botão Alto Contraste sem efeito visível; border #dee2e6 está a distância RGB 4,24 de --gray-cool-10. Limitações: .mensagem-erro-cpf só existe após enviar o formulário vazio; VLibras não acionado; links de opção apontam para /fluxo e não foram seguidos; console só com 404 de favicon; viewport padrão, sem teste responsivo."
}
````

### Decisão

````json
{
  "cardId": "C-74cffa7a4715026fc34e7270313cd33e313079a4afc243f066f037b42e49a6c1",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-74f71d3afb2423cd492a38fda6fc5ec3f6bab3d8aee24316ed23a94df4375201

Estado: pendente

No envio vazio aparece o texto 'Informe um CPF para continuar.' em um <p> solto, mas o campo não recebe aria-invalid nem aria-describedby apontando para a mensagem. A mensagem não está em região viva (role=alert/aria-live) e o foco fica no botão. Por isso o erro não é associado ao campo nem anunciado (eMAG 6.6; WCAG 3.3.1/4.1.3).

Regra declarada: govbr-3.7.0-accessibility-global-cc837bbaf713

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "govbr-3.7.0-accessibility-global-cc837bbaf713",
    "description": "No envio vazio aparece o texto 'Informe um CPF para continuar.' em um <p> solto, mas o campo não recebe aria-invalid nem aria-describedby apontando para a mensagem. A mensagem não está em região viva (role=alert/aria-live) e o foco fica no botão. Por isso o erro não é associado ao campo nem anunciado (eMAG 6.6; WCAG 3.3.1/4.1.3)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro de envio vazio, envio com '123')",
    "lista de outras opções de identificação",
    "links de ajuda e termo"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; inspeção de DOM, estilos computados e folhas de estilo da aplicação; scan_page S-page-001 (estado inicial, axe+structure+tokens), S-page-002 (após envio vazio, axe+structure, compareTo S-page-001), S-page-003/004 (tokens no formulário e em .mensagem-erro-cpf/#cpf no estado de erro), S-page-005 (tokens de cor em painéis, barra e itens). Envio vazio pelo botão Continuar: surge p.mensagem-erro-cpf ('Informe um CPF para continuar.'), sem aria-invalid, sem aria-describedby, sem região viva e o foco permanece no botão. Envio de '123' via Enter: a mensagem some e nada mais acontece (formato de CPF não validado; sem regra normativa específica, ficou como incerto e não foi reportado). Tab a partir do botão levou ao link 'Login com seu banco', que tem :focus-visible e nenhuma indicação visual (a regra .link-opcao:focus remove outline e box-shadow). Clique em 'Alto Contraste': sem mudança observável (classes e fundo inalterados, nenhum aria-pressed); sem regra específica, ficou como incerto. Observações do oráculo não promovidas a achado: classes utilitárias extras, hr.br-divider (semântica nativa preservada, role=presentation), font-size 11px na tag (sem norma). A cor #dee2e6 também aparece em border-bottom de .barra-superior e .opcao-identificacao, mas o oráculo não a sinalizou nesses elementos (S-page-005); ficou como incerto e não foi reportado. Limitações: o seletor .mensagem-erro-cpf só existe depois do envio vazio; axe sem violações (36 passes); console só tem 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-74f71d3afb2423cd492a38fda6fc5ec3f6bab3d8aee24316ed23a94df4375201",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-77e1795ae21bc58633937dee9424aa55f30cbed567378fb94ec8cf45cf876233

Estado: pendente

A classe raiz br-input está aplicada ao próprio <input>, além do wrapper <div class='br-input'>. Na anatomia do componente Input, br-input vai só no <div> (restrição ds-structure-input-tag).

Regra declarada: govbr-3.7.0-component-global-e30aab6e9a68

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".campo-cpf-fluxo"
    ],
    "rule": "govbr-3.7.0-component-global-e30aab6e9a68",
    "description": "A classe raiz br-input está aplicada ao próprio <input>, além do wrapper <div class='br-input'>. Na anatomia do componente Input, br-input vai só no <div> (restrição ds-structure-input-tag)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro de envio vazio, envio com '123')",
    "lista de outras opções de identificação",
    "links de ajuda e termo"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; inspeção de DOM, estilos computados e folhas de estilo da aplicação; scan_page S-page-001 (estado inicial, axe+structure+tokens), S-page-002 (após envio vazio, axe+structure, compareTo S-page-001), S-page-003/004 (tokens no formulário e em .mensagem-erro-cpf/#cpf no estado de erro), S-page-005 (tokens de cor em painéis, barra e itens). Envio vazio pelo botão Continuar: surge p.mensagem-erro-cpf ('Informe um CPF para continuar.'), sem aria-invalid, sem aria-describedby, sem região viva e o foco permanece no botão. Envio de '123' via Enter: a mensagem some e nada mais acontece (formato de CPF não validado; sem regra normativa específica, ficou como incerto e não foi reportado). Tab a partir do botão levou ao link 'Login com seu banco', que tem :focus-visible e nenhuma indicação visual (a regra .link-opcao:focus remove outline e box-shadow). Clique em 'Alto Contraste': sem mudança observável (classes e fundo inalterados, nenhum aria-pressed); sem regra específica, ficou como incerto. Observações do oráculo não promovidas a achado: classes utilitárias extras, hr.br-divider (semântica nativa preservada, role=presentation), font-size 11px na tag (sem norma). A cor #dee2e6 também aparece em border-bottom de .barra-superior e .opcao-identificacao, mas o oráculo não a sinalizou nesses elementos (S-page-005); ficou como incerto e não foi reportado. Limitações: o seletor .mensagem-erro-cpf só existe depois do envio vazio; axe sem violações (36 passes); console só tem 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-77e1795ae21bc58633937dee9424aa55f30cbed567378fb94ec8cf45cf876233",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7c45568a6a79b093af3893e02ff826dc3854a85e8078965057f74186918179f7

Estado: pendente

Os itens da lista de opções usam padding de 13px, fora da escala de espaçamento do DS (múltiplos de 4px, base 8px), em vez de um token de espaçamento (F-002 a F-005).

Regra declarada: govbr-3.7.0-development-global-137c50bea6ca

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-067f7b63fee64feef4dcf116feaf3226179d467059a00df6c7a3a2f13c03d20b — V-01 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-0a06d6c2666c52e5b5faea905342062b43505697aca1d40aaf8d21105dbf8b65 — V-06 · sempre · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-27d684611e863628a335eede61b151de50a847894eab9921d65b6232ce920497 — V-01 · sempre · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-50a41c9954db67f6251c43958960c5b7cc0691ec75ecb0d6f9b86d01b54d79cc — V-06 · sempre · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-6eca513e1c652d02d6c85982c332e4e1dff7d28373af26c2a88e4a148ce06dd3 — V-06 · sempre · <div> "Seu certificado digital em nuvem": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-7cc34f81b7938fc55f42db552b8c9ea3a3197fbc3f1f929564a0e3fc301bdb83 — V-01 · sempre · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-9ef8bc6f8cecdfcbc1d2095a7c3dbbba3aeb77219b849989a4de003d9c761b17 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-c0bb76ed1336638ddf8b824bde0c1214cbcfa404ae5bae82ffac1092dc9af1a9 — V-04 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
- U-cfd5477878c854c2d4e0935ac91d731ed6b16c81bcfd8f253b1eacce6d27460b — V-01 · sempre · <div> "Seu certificado digital em nuvem": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".opcao-identificacao",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-development-global-137c50bea6ca",
    "description": "Os itens da lista de opções usam padding de 13px, fora da escala de espaçamento do DS (múltiplos de 4px, base 8px), em vez de um token de espaçamento (F-002 a F-005)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro de envio vazio, envio com '123')",
    "lista de outras opções de identificação",
    "links de ajuda e termo"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; inspeção de DOM, estilos computados e folhas de estilo da aplicação; scan_page S-page-001 (estado inicial, axe+structure+tokens), S-page-002 (após envio vazio, axe+structure, compareTo S-page-001), S-page-003/004 (tokens no formulário e em .mensagem-erro-cpf/#cpf no estado de erro), S-page-005 (tokens de cor em painéis, barra e itens). Envio vazio pelo botão Continuar: surge p.mensagem-erro-cpf ('Informe um CPF para continuar.'), sem aria-invalid, sem aria-describedby, sem região viva e o foco permanece no botão. Envio de '123' via Enter: a mensagem some e nada mais acontece (formato de CPF não validado; sem regra normativa específica, ficou como incerto e não foi reportado). Tab a partir do botão levou ao link 'Login com seu banco', que tem :focus-visible e nenhuma indicação visual (a regra .link-opcao:focus remove outline e box-shadow). Clique em 'Alto Contraste': sem mudança observável (classes e fundo inalterados, nenhum aria-pressed); sem regra específica, ficou como incerto. Observações do oráculo não promovidas a achado: classes utilitárias extras, hr.br-divider (semântica nativa preservada, role=presentation), font-size 11px na tag (sem norma). A cor #dee2e6 também aparece em border-bottom de .barra-superior e .opcao-identificacao, mas o oráculo não a sinalizou nesses elementos (S-page-005); ficou como incerto e não foi reportado. Limitações: o seletor .mensagem-erro-cpf só existe depois do envio vazio; axe sem violações (36 passes); console só tem 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-7c45568a6a79b093af3893e02ff826dc3854a85e8078965057f74186918179f7",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-7deb174ed54e9f80c3be18599adee28d7fd48c264b146a42187c0692bfbd977b

Estado: pendente

No estado de erro (após enviar vazio), o texto da mensagem usa color #e60000, fora da paleta do DS (o token de perigo não foi usado). Achado determinístico (F-013).

Regra declarada: govbr-3.7.0-foundation-global-21b1a2733f7b

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>p" — <p> "Informe um CPF para continuar."

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".mensagem-erro-cpf",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-foundation-global-21b1a2733f7b",
    "description": "No estado de erro (após enviar vazio), o texto da mensagem usa color #e60000, fora da paleta do DS (o token de perigo não foi usado). Achado determinístico (F-013)."
  },
  "scope": [
    "tela inteira: barra superior (marca gov.br, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, lista de outras opções, links de ajuda e termo",
    "estado de erro após envio vazio",
    "estado após envio de CPF inválido (123) via Enter"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; leitura de DOM e estilos computados; clique em Continuar com campo vazio (surge p.mensagem-erro-cpf, foco fica no botão, sem aria-invalid/aria-describedby/live region); Tab a partir de Continuar até a.link-opcao (:focus-visible sem outline, box-shadow, sublinhado ou fundo); inspeção das regras CSS :focus/:focus-visible de todos os links, botões e input (só .link-opcao anula o indicador); digitação de '123' + Enter (mensagem de erro some e nenhuma validação/feedback aparece; como o destino é estático, a ausência de erro de formato ficou incerta e não foi reportada). scan_page: S-page-001 (inicial), S-page-002 (erro, comparado ao inicial: mesmos 6 achados), S-page-003 (tokens em mensagem/campo/títulos). axe-core 4.12.1 sem violações nos dois estados. Rejeitados por falta de norma (observações do oráculo): classes extras em componentes, br-divider em <hr>, font-size 11px da br-tag e 16px dos h2. Incerto, não reportado: ausência de instrução de formato do CPF (e-MAG 6.5 / govbr-3.7.0-accessibility-global-01b1806c30e9), só há placeholder. Não testado: comportamento real de Alto Contraste/VLibras e responsividade. Seletor .mensagem-erro-cpf só resolve no estado de erro (após enviar vazio). Erro de console: 404 em favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-7deb174ed54e9f80c3be18599adee28d7fd48c264b146a42187c0692bfbd977b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-82c6d43b2e5390b136e87644ca8d26e33662e1ae3993e705afd9821d63794101

Estado: pendente

A classe raiz br-input está aplicada ao próprio <input>, além da div wrapper. A restrição do componente input exige br-input em <div>. Achado determinístico do oráculo (F-006).

Regra declarada: ds-structure-input-tag

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".campo-cpf-fluxo"
    ],
    "rule": "ds-structure-input-tag",
    "description": "A classe raiz br-input está aplicada ao próprio <input>, além da div wrapper. A restrição do componente input exige br-input em <div>. Achado determinístico do oráculo (F-006)."
  },
  "scope": [
    "tela inteira: barra superior (marca gov.br, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, lista de outras opções, links de ajuda e termo",
    "estado de erro após envio vazio",
    "estado após envio de CPF inválido (123) via Enter"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; leitura de DOM e estilos computados; clique em Continuar com campo vazio (surge p.mensagem-erro-cpf, foco fica no botão, sem aria-invalid/aria-describedby/live region); Tab a partir de Continuar até a.link-opcao (:focus-visible sem outline, box-shadow, sublinhado ou fundo); inspeção das regras CSS :focus/:focus-visible de todos os links, botões e input (só .link-opcao anula o indicador); digitação de '123' + Enter (mensagem de erro some e nenhuma validação/feedback aparece; como o destino é estático, a ausência de erro de formato ficou incerta e não foi reportada). scan_page: S-page-001 (inicial), S-page-002 (erro, comparado ao inicial: mesmos 6 achados), S-page-003 (tokens em mensagem/campo/títulos). axe-core 4.12.1 sem violações nos dois estados. Rejeitados por falta de norma (observações do oráculo): classes extras em componentes, br-divider em <hr>, font-size 11px da br-tag e 16px dos h2. Incerto, não reportado: ausência de instrução de formato do CPF (e-MAG 6.5 / govbr-3.7.0-accessibility-global-01b1806c30e9), só há placeholder. Não testado: comportamento real de Alto Contraste/VLibras e responsividade. Seletor .mensagem-erro-cpf só resolve no estado de erro (após enviar vazio). Erro de console: 404 em favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-82c6d43b2e5390b136e87644ca8d26e33662e1ae3993e705afd9821d63794101",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-8a42a0a67a20ade12a1cbdde1bcfb575081ff03e29aacbef65d473c2288a42a0

Estado: pendente

Ao enviar o CPF vazio, o campo não é identificado programaticamente como em erro: não recebe aria-invalid e não é associado à mensagem 'Informe um CPF para continuar.' (sem aria-describedby). Usuários de leitor de tela que voltam ao campo não recebem a mensagem. Atribuição entre 3.3.1 e 1.3.1 é incerta; 3.3.1 escolhida pelo contexto de erro de entrada.

Regra declarada: wcag:3.3.1

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      "p.mensagem-erro-cpf"
    ],
    "rule": "wcag:3.3.1",
    "description": "Ao enviar o CPF vazio, o campo não é identificado programaticamente como em erro: não recebe aria-invalid e não é associado à mensagem 'Informe um CPF para continuar.' (sem aria-describedby). Usuários de leitor de tela que voltam ao campo não recebem a mensagem. Atribuição entre 3.3.1 e 1.3.1 é incerta; 3.3.1 escolhida pelo contexto de erro de entrada."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, outras opções, ajuda e termo"
  ],
  "notes": "Oráculo/scan_page indisponível; avaliação manual via Playwright (árvore de acessibilidade, DOM, estilos computados). Interações: Tab e foco em todos os controles (verificação de :focus-visible, outline, box-shadow, borda, fundo, sublinhado, pseudo-elementos e :focus-within do item pai); cálculo de contraste de todos os textos (todos >= 4.5:1, incl. mensagem de erro ~4.8:1 e selo 4.59:1); geometria de alvos (links de 20px com espaçamento suficiente — 2.5.8 rejeitado); envio do formulário vazio (mensagem 'Informe um CPF para continuar.' aparece, foco permanece no botão); envio com '123' via Enter (mensagem some, sem validação de formato); clique em Alto Contraste e VLibras. Incertos não reportados: Alto Contraste e VLibras não produzem efeito observável (sem classe, aria-pressed, widget ou mudança de cores) — pode ser stub de protótipo; ausência de links de salto (eMAG 1.5) numa página com poucos controles antes do conteúdo; seção institucional nomeada por parágrafo longo via aria-labelledby. O seletor p.mensagem-erro-cpf só resolve no estado de erro (após enviar CPF vazio); foi conferido nesse estado (1 elemento). Console: apenas 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-8a42a0a67a20ade12a1cbdde1bcfb575081ff03e29aacbef65d473c2288a42a0",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ab2154ab0806dff8b30a263d5538ddbc84af7a5e2119530f0b140be8b441f692

Estado: pendente

Os quatro br-item da lista usam padding de 13px, fora da escala de espaçamento do DS (múltiplos de 4px). A regra do Item exige padding computado na escala oficial. Achados determinísticos F-002 a F-005 (ds-token-spacing).

Regra declarada: govbr-3.7.0-component-item-a10751502b98

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)" — <div> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)" — <div> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-067f7b63fee64feef4dcf116feaf3226179d467059a00df6c7a3a2f13c03d20b — V-01 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-0a06d6c2666c52e5b5faea905342062b43505697aca1d40aaf8d21105dbf8b65 — V-06 · sempre · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-27d684611e863628a335eede61b151de50a847894eab9921d65b6232ce920497 — V-01 · sempre · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-50a41c9954db67f6251c43958960c5b7cc0691ec75ecb0d6f9b86d01b54d79cc — V-06 · sempre · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-5f4f47b27a6359de42a9205e19df4f43d7766ecb37e47c05cac3c5b267124450 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-6eca513e1c652d02d6c85982c332e4e1dff7d28373af26c2a88e4a148ce06dd3 — V-06 · sempre · <div> "Seu certificado digital em nuvem": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-7cc34f81b7938fc55f42db552b8c9ea3a3197fbc3f1f929564a0e3fc301bdb83 — V-01 · sempre · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-9ef8bc6f8cecdfcbc1d2095a7c3dbbba3aeb77219b849989a4de003d9c761b17 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-c0bb76ed1336638ddf8b824bde0c1214cbcfa404ae5bae82ffac1092dc9af1a9 — V-04 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
- U-cfd5477878c854c2d4e0935ac91d731ed6b16c81bcfd8f253b1eacce6d27460b — V-01 · sempre · <div> "Seu certificado digital em nuvem": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".opcao-identificacao",
    "relatedSelectors": [
      ".lista-opcoes"
    ],
    "rule": "govbr-3.7.0-component-item-a10751502b98",
    "description": "Os quatro br-item da lista usam padding de 13px, fora da escala de espaçamento do DS (múltiplos de 4px). A regra do Item exige padding computado na escala oficial. Achados determinísticos F-002 a F-005 (ds-token-spacing)."
  },
  "scope": [
    "tela inteira: barra superior (marca gov.br, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, lista de outras opções, links de ajuda e termo",
    "estado de erro após envio vazio",
    "estado após envio de CPF inválido (123) via Enter"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; leitura de DOM e estilos computados; clique em Continuar com campo vazio (surge p.mensagem-erro-cpf, foco fica no botão, sem aria-invalid/aria-describedby/live region); Tab a partir de Continuar até a.link-opcao (:focus-visible sem outline, box-shadow, sublinhado ou fundo); inspeção das regras CSS :focus/:focus-visible de todos os links, botões e input (só .link-opcao anula o indicador); digitação de '123' + Enter (mensagem de erro some e nenhuma validação/feedback aparece; como o destino é estático, a ausência de erro de formato ficou incerta e não foi reportada). scan_page: S-page-001 (inicial), S-page-002 (erro, comparado ao inicial: mesmos 6 achados), S-page-003 (tokens em mensagem/campo/títulos). axe-core 4.12.1 sem violações nos dois estados. Rejeitados por falta de norma (observações do oráculo): classes extras em componentes, br-divider em <hr>, font-size 11px da br-tag e 16px dos h2. Incerto, não reportado: ausência de instrução de formato do CPF (e-MAG 6.5 / govbr-3.7.0-accessibility-global-01b1806c30e9), só há placeholder. Não testado: comportamento real de Alto Contraste/VLibras e responsividade. Seletor .mensagem-erro-cpf só resolve no estado de erro (após enviar vazio). Erro de console: 404 em favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-ab2154ab0806dff8b30a263d5538ddbc84af7a5e2119530f0b140be8b441f692",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-add7c64f663007a7ee9ffd2d806b9b246a85845b3f01787ea0dbfbbaa80de92b

Estado: pendente

Os 4 links de 'Outras opções de identificação' não têm indicador de foco: com :focus-visible via Tab, outline none e box-shadow none, sem alteração de cor/fundo/sublinhado nem :focus-within no item; a regra de autor '.link-opcao:focus, .link-opcao:focus-visible { outline:none; box-shadow:none }' anula o foco do DS (WCAG 2.4.7). Verificado ao vivo pelo oráculo.

Regra declarada: govbr-3.7.0-accessibility-global-21fbcc2fe37b

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0214a63cac8b37f735b733c8ff64ccb9aa5d8ac4f74d7304e796dc17f235a647 — V-05 · sempre · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-5479553fe575f98d640713f178fb5e5b97b26268192a2196454c2ab7fefdb056 — V-05 · sempre · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-6dd43a541fcfe205e97a759af59c9678d07c611e5bc2791c1f6e8ece7486992c — V-05 · sempre · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-81b4c283e2666b5e474bfc31a3177c003b3fa07709e29bb72061625bd4d248f2 — V-05 · sempre · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-accessibility-global-21fbcc2fe37b",
    "description": "Os 4 links de 'Outras opções de identificação' não têm indicador de foco: com :focus-visible via Tab, outline none e box-shadow none, sem alteração de cor/fundo/sublinhado nem :focus-within no item; a regra de autor '.link-opcao:focus, .link-opcao:focus-visible { outline:none; box-shadow:none }' anula o foco do DS (WCAG 2.4.7). Verificado ao vivo pelo oráculo."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro vazio, CPF '123'), lista de outras opções, links de ajuda e termo"
  ],
  "notes": "Interações: snapshot e DOM inicial; scan_page completo (S-page-001); envio vazio por clique em Continuar (mensagem 'Informe um CPF para continuar.' surge) com scan comparado (S-page-002, só fingerprint mudou) e scan de tokens escopado a textos/seções/mensagem (S-page-003); preenchimento '123' + Enter (mensagem some, nada acontece, sem feedback); navegação por Tab do campo ao botão (foco visível, outline tracejado) e ao primeiro link de opção (sem indicador); clique em Alto Contraste (nenhuma mudança observável, sem aria-pressed). axe: 36 passes, 0 violações. Rejeitados: contraste da tag PRATA (branco/#168821 ≈4,6:1), <hr> br-divider com role=presentation, classes utilitárias extras e tamanhos de fonte 11px/16px (oráculo sem norma). Incertos, não reportados: ausência de instrução de formato do CPF antes do campo (eMAG 6.5); CPF inválido '123' aceito sem mensagem (não se sabe se há validação automática, 3.3.1 só se aplica a erro detectado); botão Alto Contraste sem efeito visível; border #dee2e6 está a distância RGB 4,24 de --gray-cool-10. Limitações: .mensagem-erro-cpf só existe após enviar o formulário vazio; VLibras não acionado; links de opção apontam para /fluxo e não foram seguidos; console só com 404 de favicon; viewport padrão, sem teste responsivo."
}
````

### Decisão

````json
{
  "cardId": "C-add7c64f663007a7ee9ffd2d806b9b246a85845b3f01787ea0dbfbbaa80de92b",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-b4b5d30943ca6e0818b975a7b6d23942885fef0e07c6cfb96bf99859753cbbad

Estado: pendente

Borda da lista de opções em #dee2e6 (var(--tela-borda)), fora da paleta do DS. O mais próximo é --gray-cool-10 #dfe1e2 (F-001).

Regra declarada: govbr-3.7.0-foundation-global-21b1a2733f7b

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

- U-5f4f47b27a6359de42a9205e19df4f43d7766ecb37e47c05cac3c5b267124450 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-c0bb76ed1336638ddf8b824bde0c1214cbcfa404ae5bae82ffac1092dc9af1a9 — V-04 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-foundation-global-21b1a2733f7b",
    "description": "Borda da lista de opções em #dee2e6 (var(--tela-borda)), fora da paleta do DS. O mais próximo é --gray-cool-10 #dfe1e2 (F-001)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro de envio vazio, envio com '123')",
    "lista de outras opções de identificação",
    "links de ajuda e termo"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; inspeção de DOM, estilos computados e folhas de estilo da aplicação; scan_page S-page-001 (estado inicial, axe+structure+tokens), S-page-002 (após envio vazio, axe+structure, compareTo S-page-001), S-page-003/004 (tokens no formulário e em .mensagem-erro-cpf/#cpf no estado de erro), S-page-005 (tokens de cor em painéis, barra e itens). Envio vazio pelo botão Continuar: surge p.mensagem-erro-cpf ('Informe um CPF para continuar.'), sem aria-invalid, sem aria-describedby, sem região viva e o foco permanece no botão. Envio de '123' via Enter: a mensagem some e nada mais acontece (formato de CPF não validado; sem regra normativa específica, ficou como incerto e não foi reportado). Tab a partir do botão levou ao link 'Login com seu banco', que tem :focus-visible e nenhuma indicação visual (a regra .link-opcao:focus remove outline e box-shadow). Clique em 'Alto Contraste': sem mudança observável (classes e fundo inalterados, nenhum aria-pressed); sem regra específica, ficou como incerto. Observações do oráculo não promovidas a achado: classes utilitárias extras, hr.br-divider (semântica nativa preservada, role=presentation), font-size 11px na tag (sem norma). A cor #dee2e6 também aparece em border-bottom de .barra-superior e .opcao-identificacao, mas o oráculo não a sinalizou nesses elementos (S-page-005); ficou como incerto e não foi reportado. Limitações: o seletor .mensagem-erro-cpf só existe depois do envio vazio; axe sem violações (36 passes); console só tem 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-b4b5d30943ca6e0818b975a7b6d23942885fef0e07c6cfb96bf99859753cbbad",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c0c9b0fa25249b7d625f113086e7884690fc038fd9ca9920fe9704fce1be2044

Estado: pendente

A borda da lista de opções usa #dee2e6 (via var(--tela-borda)), que não é cor da paleta do DS; o token mais próximo é --gray-cool-10 (#dfe1e2). Achado determinístico (F-001).

Regra declarada: govbr-3.7.0-foundation-global-21b1a2733f7b

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

- U-5f4f47b27a6359de42a9205e19df4f43d7766ecb37e47c05cac3c5b267124450 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-c0bb76ed1336638ddf8b824bde0c1214cbcfa404ae5bae82ffac1092dc9af1a9 — V-04 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-foundation-global-21b1a2733f7b",
    "description": "A borda da lista de opções usa #dee2e6 (via var(--tela-borda)), que não é cor da paleta do DS; o token mais próximo é --gray-cool-10 (#dfe1e2). Achado determinístico (F-001)."
  },
  "scope": [
    "tela inteira: barra superior (marca gov.br, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, lista de outras opções, links de ajuda e termo",
    "estado de erro após envio vazio",
    "estado após envio de CPF inválido (123) via Enter"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; leitura de DOM e estilos computados; clique em Continuar com campo vazio (surge p.mensagem-erro-cpf, foco fica no botão, sem aria-invalid/aria-describedby/live region); Tab a partir de Continuar até a.link-opcao (:focus-visible sem outline, box-shadow, sublinhado ou fundo); inspeção das regras CSS :focus/:focus-visible de todos os links, botões e input (só .link-opcao anula o indicador); digitação de '123' + Enter (mensagem de erro some e nenhuma validação/feedback aparece; como o destino é estático, a ausência de erro de formato ficou incerta e não foi reportada). scan_page: S-page-001 (inicial), S-page-002 (erro, comparado ao inicial: mesmos 6 achados), S-page-003 (tokens em mensagem/campo/títulos). axe-core 4.12.1 sem violações nos dois estados. Rejeitados por falta de norma (observações do oráculo): classes extras em componentes, br-divider em <hr>, font-size 11px da br-tag e 16px dos h2. Incerto, não reportado: ausência de instrução de formato do CPF (e-MAG 6.5 / govbr-3.7.0-accessibility-global-01b1806c30e9), só há placeholder. Não testado: comportamento real de Alto Contraste/VLibras e responsividade. Seletor .mensagem-erro-cpf só resolve no estado de erro (após enviar vazio). Erro de console: 404 em favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-c0c9b0fa25249b7d625f113086e7884690fc038fd9ca9920fe9704fce1be2044",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c3eac196b04b161e9202137333f8273e5df7b2a7054a17d4f67137bfc3e13117

Estado: pendente

Painel institucional, cartão de identificação e lista de opções usam borda 1px solid var(--tela-borda) = #dee2e6, cor fora da paleta de tokens do DS (mais próximo --gray-cool-10 #dfe1e2) (F-001, F-013, F-015).

Regra declarada: govbr-3.7.0-foundation-global-21b1a2733f7b

### Sujeitos

- "body>div>main>section:nth-of-type(1)" — <section> "Uma conta gov.br garante a identificação de cada"
- "body>div>main>section:nth-of-type(2)" — <section> "Identifique-se no gov.br com: Número do CPF Digi"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

- U-24f8649c86edd48cb272f7ea700ca52ea9ce91dd03a1fc067ddee5e082af509d — V-06 · sempre · <section> "Identifique-se no gov.br com: Número do CPF Digi": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-5f4f47b27a6359de42a9205e19df4f43d7766ecb37e47c05cac3c5b267124450 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-93cf9ff921e72050a03775c9189d805dedf420d2bb09d2193709fd283a7987ab — V-06 · sempre · <section> "Uma conta gov.br garante a identificação de cada": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-c0bb76ed1336638ddf8b824bde0c1214cbcfa404ae5bae82ffac1092dc9af1a9 — V-04 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".painel-institucional, .cartao-identificacao, .lista-opcoes",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-foundation-global-21b1a2733f7b",
    "description": "Painel institucional, cartão de identificação e lista de opções usam borda 1px solid var(--tela-borda) = #dee2e6, cor fora da paleta de tokens do DS (mais próximo --gray-cool-10 #dfe1e2) (F-001, F-013, F-015)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro vazio, CPF '123'), lista de outras opções, links de ajuda e termo"
  ],
  "notes": "Interações: snapshot e DOM inicial; scan_page completo (S-page-001); envio vazio por clique em Continuar (mensagem 'Informe um CPF para continuar.' surge) com scan comparado (S-page-002, só fingerprint mudou) e scan de tokens escopado a textos/seções/mensagem (S-page-003); preenchimento '123' + Enter (mensagem some, nada acontece, sem feedback); navegação por Tab do campo ao botão (foco visível, outline tracejado) e ao primeiro link de opção (sem indicador); clique em Alto Contraste (nenhuma mudança observável, sem aria-pressed). axe: 36 passes, 0 violações. Rejeitados: contraste da tag PRATA (branco/#168821 ≈4,6:1), <hr> br-divider com role=presentation, classes utilitárias extras e tamanhos de fonte 11px/16px (oráculo sem norma). Incertos, não reportados: ausência de instrução de formato do CPF antes do campo (eMAG 6.5); CPF inválido '123' aceito sem mensagem (não se sabe se há validação automática, 3.3.1 só se aplica a erro detectado); botão Alto Contraste sem efeito visível; border #dee2e6 está a distância RGB 4,24 de --gray-cool-10. Limitações: .mensagem-erro-cpf só existe após enviar o formulário vazio; VLibras não acionado; links de opção apontam para /fluxo e não foram seguidos; console só com 404 de favicon; viewport padrão, sem teste responsivo."
}
````

### Decisão

````json
{
  "cardId": "C-c3eac196b04b161e9202137333f8273e5df7b2a7054a17d4f67137bfc3e13117",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c628004939273fe9f680b98d1c1b5473d748234e9334a2341702bd4b6bd51376

Estado: pendente

Ao enviar o CPF vazio aparece o texto 'Informe um CPF para continuar.', mas ele não fica associado ao campo: #cpf não recebe aria-describedby nem aria-invalid, a mensagem não tem role=alert/aria-live e o foco continua no botão Continuar. e-MAG 6.6 / WCAG 3.3.1. verify_finding confirmou.

Regra declarada: govbr-3.7.0-accessibility-global-cc837bbaf713

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-1c25a48359f21fea164b43964c588421584197d8a77c437668337f0a2cbba0b4 — V-03b · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro do CPF é inserida sem role="alert" nem aria-live: leitor de tela não anuncia. Unidade CONDICIONAL — só existe depois de submeter o campo vazio, estado produzido pelo setup do gabarito.
- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.
- U-e2b58d0f444bf269c882df48b680db18d6fddafac77ded398a7e08665eddc1c9 — V-09 · apos-submit-vazio · <p> "Informe um CPF para continuar.": a mensagem de erro usa color: #e60000, valor autoral fora do registro de tokens do gov.br DS. Lacuna descoberta pela medição determinística da Phase 10 no estado condicional, não pela bateria original.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".mensagem-erro-cpf"
    ],
    "rule": "govbr-3.7.0-accessibility-global-cc837bbaf713",
    "description": "Ao enviar o CPF vazio aparece o texto 'Informe um CPF para continuar.', mas ele não fica associado ao campo: #cpf não recebe aria-describedby nem aria-invalid, a mensagem não tem role=alert/aria-live e o foco continua no botão Continuar. e-MAG 6.6 / WCAG 3.3.1. verify_finding confirmou."
  },
  "scope": [
    "tela inteira: barra superior (marca gov.br, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, lista de outras opções, links de ajuda e termo",
    "estado de erro após envio vazio",
    "estado após envio de CPF inválido (123) via Enter"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; leitura de DOM e estilos computados; clique em Continuar com campo vazio (surge p.mensagem-erro-cpf, foco fica no botão, sem aria-invalid/aria-describedby/live region); Tab a partir de Continuar até a.link-opcao (:focus-visible sem outline, box-shadow, sublinhado ou fundo); inspeção das regras CSS :focus/:focus-visible de todos os links, botões e input (só .link-opcao anula o indicador); digitação de '123' + Enter (mensagem de erro some e nenhuma validação/feedback aparece; como o destino é estático, a ausência de erro de formato ficou incerta e não foi reportada). scan_page: S-page-001 (inicial), S-page-002 (erro, comparado ao inicial: mesmos 6 achados), S-page-003 (tokens em mensagem/campo/títulos). axe-core 4.12.1 sem violações nos dois estados. Rejeitados por falta de norma (observações do oráculo): classes extras em componentes, br-divider em <hr>, font-size 11px da br-tag e 16px dos h2. Incerto, não reportado: ausência de instrução de formato do CPF (e-MAG 6.5 / govbr-3.7.0-accessibility-global-01b1806c30e9), só há placeholder. Não testado: comportamento real de Alto Contraste/VLibras e responsividade. Seletor .mensagem-erro-cpf só resolve no estado de erro (após enviar vazio). Erro de console: 404 em favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-c628004939273fe9f680b98d1c1b5473d748234e9334a2341702bd4b6bd51376",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-c90307ebbcd6907c7e492684a3c1445e0bffc4afb2c613d55b126d21d6d1d4c3

Estado: pendente

Os 4 links de 'Outras opções de identificação' ficam sem nenhum indicador de foco visível ao receber foco pelo teclado (:focus-visible = true; outline-style none, box-shadow none, sem mudança de cor, fundo ou sublinhado). A regra do autor '.link-opcao:focus, .link-opcao:focus-visible { outline: none; box-shadow: none; }' anula o foco (eMAG 4.4 / WCAG 2.4.7).

Regra declarada: govbr-3.7.0-accessibility-global-21fbcc2fe37b

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0214a63cac8b37f735b733c8ff64ccb9aa5d8ac4f74d7304e796dc17f235a647 — V-05 · sempre · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-5479553fe575f98d640713f178fb5e5b97b26268192a2196454c2ab7fefdb056 — V-05 · sempre · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-6dd43a541fcfe205e97a759af59c9678d07c611e5bc2791c1f6e8ece7486992c — V-05 · sempre · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-81b4c283e2666b5e474bfc31a3177c003b3fa07709e29bb72061625bd4d248f2 — V-05 · sempre · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-accessibility-global-21fbcc2fe37b",
    "description": "Os 4 links de 'Outras opções de identificação' ficam sem nenhum indicador de foco visível ao receber foco pelo teclado (:focus-visible = true; outline-style none, box-shadow none, sem mudança de cor, fundo ou sublinhado). A regra do autor '.link-opcao:focus, .link-opcao:focus-visible { outline: none; box-shadow: none; }' anula o foco (eMAG 4.4 / WCAG 2.4.7)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro de envio vazio, envio com '123')",
    "lista de outras opções de identificação",
    "links de ajuda e termo"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; inspeção de DOM, estilos computados e folhas de estilo da aplicação; scan_page S-page-001 (estado inicial, axe+structure+tokens), S-page-002 (após envio vazio, axe+structure, compareTo S-page-001), S-page-003/004 (tokens no formulário e em .mensagem-erro-cpf/#cpf no estado de erro), S-page-005 (tokens de cor em painéis, barra e itens). Envio vazio pelo botão Continuar: surge p.mensagem-erro-cpf ('Informe um CPF para continuar.'), sem aria-invalid, sem aria-describedby, sem região viva e o foco permanece no botão. Envio de '123' via Enter: a mensagem some e nada mais acontece (formato de CPF não validado; sem regra normativa específica, ficou como incerto e não foi reportado). Tab a partir do botão levou ao link 'Login com seu banco', que tem :focus-visible e nenhuma indicação visual (a regra .link-opcao:focus remove outline e box-shadow). Clique em 'Alto Contraste': sem mudança observável (classes e fundo inalterados, nenhum aria-pressed); sem regra específica, ficou como incerto. Observações do oráculo não promovidas a achado: classes utilitárias extras, hr.br-divider (semântica nativa preservada, role=presentation), font-size 11px na tag (sem norma). A cor #dee2e6 também aparece em border-bottom de .barra-superior e .opcao-identificacao, mas o oráculo não a sinalizou nesses elementos (S-page-005); ficou como incerto e não foi reportado. Limitações: o seletor .mensagem-erro-cpf só existe depois do envio vazio; axe sem violações (36 passes); console só tem 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-c90307ebbcd6907c7e492684a3c1445e0bffc4afb2c613d55b126d21d6d1d4c3",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d0e67798d5c80f7e93a113e73a825068360bc9367a5415e3567b9f747acf6f1d

Estado: pendente

Os 4 links de outras opções de identificação têm a regra CSS '.link-opcao:focus, .link-opcao:focus-visible { outline: none; box-shadow: none }', que anula o foco padrão do design system. Com o teclado (Tab a partir de Continuar), o link recebe :focus-visible sem outline, sombra, fundo ou sublinhado: não há indicador de foco visível.

Regra declarada: wcag:2.4.7

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0214a63cac8b37f735b733c8ff64ccb9aa5d8ac4f74d7304e796dc17f235a647 — V-05 · sempre · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-5479553fe575f98d640713f178fb5e5b97b26268192a2196454c2ab7fefdb056 — V-05 · sempre · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-6dd43a541fcfe205e97a759af59c9678d07c611e5bc2791c1f6e8ece7486992c — V-05 · sempre · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-81b4c283e2666b5e474bfc31a3177c003b3fa07709e29bb72061625bd4d248f2 — V-05 · sempre · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "wcag:2.4.7",
    "description": "Os 4 links de outras opções de identificação têm a regra CSS '.link-opcao:focus, .link-opcao:focus-visible { outline: none; box-shadow: none }', que anula o foco padrão do design system. Com o teclado (Tab a partir de Continuar), o link recebe :focus-visible sem outline, sombra, fundo ou sublinhado: não há indicador de foco visível."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, estado de erro com CPF vazio, envio com CPF '123'",
    "lista de outras opções de identificação",
    "links de ajuda e termo de uso"
  ],
  "notes": "Sem oráculo nem scan_page; ids WCAG atribuídos manualmente. Interações: snapshot da árvore de acessibilidade e leitura de DOM/estilos/regras CSS; clique em Continuar com CPF vazio (mensagem 'Informe um CPF para continuar.' aparece, foco fica no botão, sem aria-invalid/aria-describedby/live region); Enter no campo vazio (mesmo resultado, foco no campo); envio de '123' (mensagem some, nenhuma validação nem navegação — não reportado, pois nenhum erro é detectado); clique em Alto Contraste e VLibras (nenhuma mudança observável de DOM/estilo além de hover; registrado como incerto e não reportado, pois o contraste padrão já atende ao 1.4.3); Tab a partir de Continuar até 'Login com seu banco' (:focus-visible verdadeiro, outline none e box-shadow none, sem indicador visual, confirmado por screenshot). Contrastes verificados e aprovados: selo branco sobre #168821 (~4.6:1), texto #555, links #1351b4, borda do campo #888 (~3.5:1), mensagem de erro #e60000 (~4.8:1). Alvos dos links de opção têm 20px de altura, mas passam no 2.5.8 pela exceção de espaçamento. Frase institucional em <p> com 24px, usada como rótulo da região: rejeitada como cabeçalho visual obrigatório (atribuição incerta). O seletor .mensagem-erro-cpf só existe após enviar com CPF vazio; verificado nesse estado. Console: 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-d0e67798d5c80f7e93a113e73a825068360bc9367a5415e3567b9f747acf6f1d",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-d3022f1d0b178182deac41d065869e05f78ec3c87e5035efb9b722f4fa502819

Estado: pendente

As 4 opções de identificação são apresentadas visualmente como lista (componente br-list/br-item), mas são divs sem role=list/listitem nem ul/li, então a estrutura e a quantidade de itens não são expostas. Atribuição com confiança moderada: agrupamento percebido como lista sem semântica.

Regra declarada: wcag:1.3.1

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)" — <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c"

### Unidades candidatas (não são crédito)

- U-067f7b63fee64feef4dcf116feaf3226179d467059a00df6c7a3a2f13c03d20b — V-01 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-0a06d6c2666c52e5b5faea905342062b43505697aca1d40aaf8d21105dbf8b65 — V-06 · sempre · <div> "Login com QR code": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-27d684611e863628a335eede61b151de50a847894eab9921d65b6232ce920497 — V-01 · sempre · <div> "Login com QR code": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-50a41c9954db67f6251c43958960c5b7cc0691ec75ecb0d6f9b86d01b54d79cc — V-06 · sempre · <div> "Seu certificado digital": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-5f4f47b27a6359de42a9205e19df4f43d7766ecb37e47c05cac3c5b267124450 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-6eca513e1c652d02d6c85982c332e4e1dff7d28373af26c2a88e4a148ce06dd3 — V-06 · sempre · <div> "Seu certificado digital em nuvem": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-7cc34f81b7938fc55f42db552b8c9ea3a3197fbc3f1f929564a0e3fc301bdb83 — V-01 · sempre · <div> "Seu certificado digital": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.
- U-9ef8bc6f8cecdfcbc1d2095a7c3dbbba3aeb77219b849989a4de003d9c761b17 — V-06 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-c0bb76ed1336638ddf8b824bde0c1214cbcfa404ae5bae82ffac1092dc9af1a9 — V-04 · sempre · <div> "Login com seu banco SUA CONTA SERÁ PRATA Login c": o contêiner usa a classe .br-list e os filhos usam .br-item, mas nenhum carrega role="list"/role="listitem" nem é <ul>/<li>: a semântica de lista existe visualmente e não na árvore de acessibilidade. Defeito de COMPOSIÇÃO — cada componente está certo isolado, o conjunto não. Escopo corrigido de `unico` para `composicao` em 2026-09-09 (D-33): a âncora passa a nomear os CINCO participantes (o contêiner e os quatro `.br-item`), e a spec segue valendo UMA unidade. Ancorando só no contêiner, a leitura correta — dizer que os itens não têm papel de item de lista — não casava em nenhum passo e era cobrada como falso positivo. `todos` não serve aqui: a semântica de lista é propriedade do conjunto e um único conserto a repara, então quatro créditos premiariam enumerar.
- U-cfd5477878c854c2d4e0935ac91d731ed6b16c81bcfd8f253b1eacce6d27460b — V-01 · sempre · <div> "Seu certificado digital em nuvem": padding computado de 13px em TODAS as quatro opções de identificação — fora da escala de espaçamento do DS (0 / 4px / 8px / 16px). Caso decisivo do D-23: como as quatro instâncias são idênticas, a comparação com os irmãos não acusa nada; só a norma externa dá veredito.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".lista-opcoes",
    "relatedSelectors": [
      ".opcao-identificacao"
    ],
    "rule": "wcag:1.3.1",
    "description": "As 4 opções de identificação são apresentadas visualmente como lista (componente br-list/br-item), mas são divs sem role=list/listitem nem ul/li, então a estrutura e a quantidade de itens não são expostas. Atribuição com confiança moderada: agrupamento percebido como lista sem semântica."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Sem oráculo/scan_page: avaliação manual via árvore de acessibilidade, DOM e estilos computados. Interações: Tab e foco por teclado em todos os controles (comparação de outline/box-shadow/fundo/sublinhado com e sem :focus-visible, incluindo item pai e pseudo-elementos); envio vazio (clique em Continuar) -> surge p.mensagem-erro-cpf, foco permanece no botão, sem live region nem aria-invalid/aria-describedby; envio de '123' com Enter -> mensagem some e nada acontece (sem validação de formato observável; incerto, não reportado); clique em Alto Contraste -> nenhuma mudança observável (sem classes, cores ou aria-pressed; possível controle não funcional de protótipo, sem id normativo justificável, não reportado); clique em VLibras -> nenhum widget/diálogo aparece (não reportado); viewport 320x800 -> rolagem horizontal (scrollWidth 447 vs 305) com botão VLibras fora da tela. Contraste de textos calculado: todos >= 4.5:1 (tag PRATA 4.59:1 a 11px; erro rgb(230,0,0) ~4.8:1). Rejeitados: nome acessível da marca contém texto visível (2.5.3 ok); alvos de 20px de altura nos links de opção com espaçamento suficiente (2.5.8 ok); títulos h1/h2 coerentes; lang pt-BR e title presentes. Incerto: ausência de link de salto (eMAG 1.5) com main presente e só 3 controles no cabeçalho, não reportado. Seletores conferidos com querySelectorAll; p.mensagem-erro-cpf só existe após envio vazio. Console: 404 de favicon.ico apenas."
}
````

### Decisão

````json
{
  "cardId": "C-d3022f1d0b178182deac41d065869e05f78ec3c87e5035efb9b722f4fa502819",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-dc1b53c1bfa6e55f10b00e1244252027da7f73f50f2e0ce8c74e848315571a7f

Estado: pendente

A classe de componente br-input é aplicada também ao próprio <input>, além do wrapper <div class='br-input'>; na anatomia do DS br-input identifica o contêiner <div>, não o campo (F-006).

Regra declarada: govbr-3.7.0-component-global-e30aab6e9a68

### Sujeitos

- "body>div>main>section:nth-of-type(2)>form>div>input" — <input#cpf> "Digite seu CPF"

### Unidades candidatas (não são crédito)

- U-3579ee7d239a19f7e82beedaa64a9c9aedb2f1b311838eaa937491ea1f9affee — V-11 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não cumpre a recomendação e-MAG 6.5 (instruções para entrada de dados), e falha por DUAS manifestações, ambas medidas na página: (a) obrigatoriedade sinalizada só programaticamente — traz aria-required="true" e o texto visível do formulário é apenas "CPF Continuar", sem asterisco com legenda e sem a palavra obrigatório; (b) nenhuma instrução de formato — o único apoio é o placeholder "Digite seu CPF", não há <small> nem elemento de dica, aria-describedby é nulo, e em lugar nenhum se diz quantos dígitos ou se leva pontuação. A UNIDADE É UMA SÓ porque a unidade é (elemento × regra) e as duas manifestações são da mesma recomendação no mesmo campo; quem alega qualquer uma das duas casa aqui. NÃO é a V-02, que é o texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") não associado por aria-describedby: aquela ancora em wcag:3.3.2, e é por isso que esta ancora na regra e-MAG, para não colidir. A regra é a 6.5, NÃO a 6.3: até o validator 2.3.0 o oráculo servia a 6.3 com esta descrição, e foi por isso que a alegação original citou 6.3 (D-14). Lacuna incorporada em 2026-09-14 (D-35), pagando DUAS dívidas de adjudicação: E-7a5432:df14769a (obrigatoriedade) e o componente `lacuna-gabarito` de E-7a5432:0918f5ad (instrução de formato, pendente desde 2026-09-04).
- U-44a6cf4b97acc8d192caf1310fb836c7cc2b3f24bde161dfb0f3597b9eb1626d — V-03a · sempre · <input#cpf> "Digite seu CPF": o campo de CPF não identifica programaticamente o estado de erro (sem aria-invalid e sem associação estável por aria-describedby). Esta unidade existe em todo estado e ancora no controle que o usuário opera.
- U-c50c7666c9c5e25a9382f0ced7d83c4ca0b65320af653f610ff71c6bb9ee8af8 — V-08 · sempre · <input#cpf> "Digite seu CPF": a classe raiz .br-input aparece indevidamente no próprio <input>, além do contêiner <div class="br-input"> canônico. Lacuna encontrada na primeira medida e incorporada conforme D-28.
- U-c5fb8f58afcde46663afbb8e11484560277483a2b6d0917a0679a7795d83360d — V-02 · sempre · <input#cpf> "Digite seu CPF": o campo de CPF tem texto de apoio visível ("Digite seu CPF para criar ou acessar sua conta gov.br") que não está associado ao campo por aria-describedby. Regra CONDICIONAL: só existe porque há texto de apoio — um campo sem apoio não a viola.

### Evidência declarada

````json
{
  "finding": {
    "selector": "#cpf",
    "relatedSelectors": [
      ".campo-cpf-fluxo"
    ],
    "rule": "govbr-3.7.0-component-global-e30aab6e9a68",
    "description": "A classe de componente br-input é aplicada também ao próprio <input>, além do wrapper <div class='br-input'>; na anatomia do DS br-input identifica o contêiner <div>, não o campo (F-006)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro vazio, CPF '123'), lista de outras opções, links de ajuda e termo"
  ],
  "notes": "Interações: snapshot e DOM inicial; scan_page completo (S-page-001); envio vazio por clique em Continuar (mensagem 'Informe um CPF para continuar.' surge) com scan comparado (S-page-002, só fingerprint mudou) e scan de tokens escopado a textos/seções/mensagem (S-page-003); preenchimento '123' + Enter (mensagem some, nada acontece, sem feedback); navegação por Tab do campo ao botão (foco visível, outline tracejado) e ao primeiro link de opção (sem indicador); clique em Alto Contraste (nenhuma mudança observável, sem aria-pressed). axe: 36 passes, 0 violações. Rejeitados: contraste da tag PRATA (branco/#168821 ≈4,6:1), <hr> br-divider com role=presentation, classes utilitárias extras e tamanhos de fonte 11px/16px (oráculo sem norma). Incertos, não reportados: ausência de instrução de formato do CPF antes do campo (eMAG 6.5); CPF inválido '123' aceito sem mensagem (não se sabe se há validação automática, 3.3.1 só se aplica a erro detectado); botão Alto Contraste sem efeito visível; border #dee2e6 está a distância RGB 4,24 de --gray-cool-10. Limitações: .mensagem-erro-cpf só existe após enviar o formulário vazio; VLibras não acionado; links de opção apontam para /fluxo e não foram seguidos; console só com 404 de favicon; viewport padrão, sem teste responsivo."
}
````

### Decisão

````json
{
  "cardId": "C-dc1b53c1bfa6e55f10b00e1244252027da7f73f50f2e0ce8c74e848315571a7f",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-e0e11e7df22bb15167cab2a5e974d8b3357b0c84f0cac316117741b999d485b8

Estado: pendente

Com foco por teclado (:focus-visible), os links das opções de identificação ficam sem indicador: outline-style none, box-shadow none, sem sublinhado nem mudança de fundo. As regras .link-opcao:focus e .link-opcao:focus-visible anulam o outline do DS. Testado com Tab; verify_finding confirmou.

Regra declarada: govbr-3.7.0-accessibility-global-21fbcc2fe37b

### Sujeitos

- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(1)>a" — <a> "Login com seu banco"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(2)>a" — <a> "Login com QR code"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(3)>a" — <a> "Seu certificado digital"
- "body>div>main>section:nth-of-type(2)>div:nth-of-type(2)>div:nth-of-type(4)>a" — <a> "Seu certificado digital em nuvem"

### Unidades candidatas (não são crédito)

- U-0214a63cac8b37f735b733c8ff64ccb9aa5d8ac4f74d7304e796dc17f235a647 — V-05 · sempre · <a> "Seu certificado digital em nuvem": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-5479553fe575f98d640713f178fb5e5b97b26268192a2196454c2ab7fefdb056 — V-05 · sempre · <a> "Login com QR code": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-6dd43a541fcfe205e97a759af59c9678d07c611e5bc2791c1f6e8ece7486992c — V-05 · sempre · <a> "Seu certificado digital": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.
- U-81b4c283e2666b5e474bfc31a3177c003b3fa07709e29bb72061625bd4d248f2 — V-05 · sempre · <a> "Login com seu banco": indicador de foco suprimido (outline: none + box-shadow: none) nos QUATRO links de opção. Segunda violação compartilhada: navegando por teclado, nenhum dos irmãos contradiz o outro.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".link-opcao",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-accessibility-global-21fbcc2fe37b",
    "description": "Com foco por teclado (:focus-visible), os links das opções de identificação ficam sem indicador: outline-style none, box-shadow none, sem sublinhado nem mudança de fundo. As regras .link-opcao:focus e .link-opcao:focus-visible anulam o outline do DS. Testado com Tab; verify_finding confirmou."
  },
  "scope": [
    "tela inteira: barra superior (marca gov.br, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF, lista de outras opções, links de ajuda e termo",
    "estado de erro após envio vazio",
    "estado após envio de CPF inválido (123) via Enter"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; leitura de DOM e estilos computados; clique em Continuar com campo vazio (surge p.mensagem-erro-cpf, foco fica no botão, sem aria-invalid/aria-describedby/live region); Tab a partir de Continuar até a.link-opcao (:focus-visible sem outline, box-shadow, sublinhado ou fundo); inspeção das regras CSS :focus/:focus-visible de todos os links, botões e input (só .link-opcao anula o indicador); digitação de '123' + Enter (mensagem de erro some e nenhuma validação/feedback aparece; como o destino é estático, a ausência de erro de formato ficou incerta e não foi reportada). scan_page: S-page-001 (inicial), S-page-002 (erro, comparado ao inicial: mesmos 6 achados), S-page-003 (tokens em mensagem/campo/títulos). axe-core 4.12.1 sem violações nos dois estados. Rejeitados por falta de norma (observações do oráculo): classes extras em componentes, br-divider em <hr>, font-size 11px da br-tag e 16px dos h2. Incerto, não reportado: ausência de instrução de formato do CPF (e-MAG 6.5 / govbr-3.7.0-accessibility-global-01b1806c30e9), só há placeholder. Não testado: comportamento real de Alto Contraste/VLibras e responsividade. Seletor .mensagem-erro-cpf só resolve no estado de erro (após enviar vazio). Erro de console: 404 em favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-e0e11e7df22bb15167cab2a5e974d8b3357b0c84f0cac316117741b999d485b8",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-ed677907fd8e805204c05462df87ba16ba2b1fa7238560994852e4ecdd63eafc

Estado: pendente

Com viewport de 320px CSS, a .barra-recursos não quebra linha (vai de 93 a 447px) e força rolagem horizontal (scrollWidth 447 > 305). O botão VLibras fica totalmente fora da área visível (x 305–447).

Regra declarada: wcag:1.4.10

### Sujeitos

- "body>div>header>div>button:nth-of-type(2)" — <button> "VLibras"

### Unidades candidatas (não são crédito)

- U-50fd8967dbacd5176153b60bcd6b57309791845aa022e043c169a53c0fb7be63 — V-10 · sempre · <div> "Alto Contraste VLibras": a barra de acessibilidade não traz âncora de salto para o conteúdo principal: dos 7 links da página nenhum aponta para fragmento (todos href="/fluxo"), o <main> não tem id que sirva de destino, e o primeiro ponto de tabulação é a marca gov.br. As duas verificações da recomendação 1.5 falham. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:74ed1b06.
- U-a00d0cad9861911853c5c3160f83aa5ad2e65f099316f3fc42df41421bf45f63 — V-12 · sempre · <div> "Alto Contraste VLibras": a barra de recursos deixa de ser utilizável em viewport móvel. A 320px ela não quebra linha (flex-wrap: nowrap): termina em x=447 contra clientWidth 305, leva o scrollWidth do documento a 447 e deixa o botão VLibras inteiramente fora da viewport (left=305, right=447), alcançável só por rolagem horizontal da página. Foi o único bloco a estourar a borda direita. Regra normativa de força `required`. Declara `viewport` porque o defeito NÃO existe na janela padrão da suíte — medi-lo a 1280 cobraria do axe algo que ele não teria como ver. Mesma âncora da V-10, regra diferente, logo unidade diferente. Lacuna incorporada em 2026-09-14 (D-35) a partir da adjudicação de E-ee9ba1:fce4c972.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".recurso-libras",
    "relatedSelectors": [
      ".barra-recursos"
    ],
    "rule": "wcag:1.4.10",
    "description": "Com viewport de 320px CSS, a .barra-recursos não quebra linha (vai de 93 a 447px) e força rolagem horizontal (scrollWidth 447 > 305). O botão VLibras fica totalmente fora da área visível (x 305–447)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras), painel institucional, cartão de identificação (formulário CPF, outras opções, ajuda, termo)"
  ],
  "notes": "Sem oráculo/scan_page: avaliação manual via árvore de acessibilidade, DOM e estilos computados. Interações: Tab e foco por teclado em todos os controles (comparação de outline/box-shadow/fundo/sublinhado com e sem :focus-visible, incluindo item pai e pseudo-elementos); envio vazio (clique em Continuar) -> surge p.mensagem-erro-cpf, foco permanece no botão, sem live region nem aria-invalid/aria-describedby; envio de '123' com Enter -> mensagem some e nada acontece (sem validação de formato observável; incerto, não reportado); clique em Alto Contraste -> nenhuma mudança observável (sem classes, cores ou aria-pressed; possível controle não funcional de protótipo, sem id normativo justificável, não reportado); clique em VLibras -> nenhum widget/diálogo aparece (não reportado); viewport 320x800 -> rolagem horizontal (scrollWidth 447 vs 305) com botão VLibras fora da tela. Contraste de textos calculado: todos >= 4.5:1 (tag PRATA 4.59:1 a 11px; erro rgb(230,0,0) ~4.8:1). Rejeitados: nome acessível da marca contém texto visível (2.5.3 ok); alvos de 20px de altura nos links de opção com espaçamento suficiente (2.5.8 ok); títulos h1/h2 coerentes; lang pt-BR e title presentes. Incerto: ausência de link de salto (eMAG 1.5) com main presente e só 3 controles no cabeçalho, não reportado. Seletores conferidos com querySelectorAll; p.mensagem-erro-cpf só existe após envio vazio. Console: 404 de favicon.ico apenas."
}
````

### Decisão

````json
{
  "cardId": "C-ed677907fd8e805204c05462df87ba16ba2b1fa7238560994852e4ecdd63eafc",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````

## C-f638eb9f5c320aa45d975d4f423ed770569d75f5020ac2cb00441193ab2f9927

Estado: pendente

Bordas do painel institucional e do cartão de identificação em #dee2e6 (var(--tela-borda)), fora da paleta do DS. O mais próximo é --gray-cool-10 (F-009, F-010).

Regra declarada: govbr-3.7.0-foundation-global-21b1a2733f7b

### Sujeitos

- "body>div>main>section:nth-of-type(1)" — <section> "Uma conta gov.br garante a identificação de cada"
- "body>div>main>section:nth-of-type(2)" — <section> "Identifique-se no gov.br com: Número do CPF Digi"

### Unidades candidatas (não são crédito)

- U-24f8649c86edd48cb272f7ea700ca52ea9ce91dd03a1fc067ddee5e082af509d — V-06 · sempre · <section> "Identifique-se no gov.br com: Número do CPF Digi": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.
- U-93cf9ff921e72050a03775c9189d805dedf420d2bb09d2193709fd283a7987ab — V-06 · sempre · <section> "Uma conta gov.br garante a identificação de cada": a variável autoral `--tela-borda: #dee2e6` em fluxo.css não corresponde a token do gov.br DS (o mais próximo é --gray-cool-10, #dfe1e2) e pinta a borda de OITO elementos: barra superior, painel institucional, cartão de identificação, lista de opções e as quatro opções. Terceira violação compartilhada da tela, ao lado de V-01 e V-05 — a maior das três. Escopo corrigido de `unico` para `todos` em 2026-09-04 (D-31): o defeito sempre foi compartilhado, e catalogar só `.lista-opcoes` cobrava como falso positivo a enumeração correta dos irmãos.

### Evidência declarada

````json
{
  "finding": {
    "selector": ".painel-institucional, .cartao-identificacao",
    "relatedSelectors": [],
    "rule": "govbr-3.7.0-foundation-global-21b1a2733f7b",
    "description": "Bordas do painel institucional e do cartão de identificação em #dee2e6 (var(--tela-borda)), fora da paleta do DS. O mais próximo é --gray-cool-10 (F-009, F-010)."
  },
  "scope": [
    "tela inteira: barra superior (marca, Alto Contraste, VLibras)",
    "painel institucional",
    "cartão de identificação: formulário CPF (estados inicial, erro de envio vazio, envio com '123')",
    "lista de outras opções de identificação",
    "links de ajuda e termo"
  ],
  "notes": "Interações: snapshot da árvore de acessibilidade; inspeção de DOM, estilos computados e folhas de estilo da aplicação; scan_page S-page-001 (estado inicial, axe+structure+tokens), S-page-002 (após envio vazio, axe+structure, compareTo S-page-001), S-page-003/004 (tokens no formulário e em .mensagem-erro-cpf/#cpf no estado de erro), S-page-005 (tokens de cor em painéis, barra e itens). Envio vazio pelo botão Continuar: surge p.mensagem-erro-cpf ('Informe um CPF para continuar.'), sem aria-invalid, sem aria-describedby, sem região viva e o foco permanece no botão. Envio de '123' via Enter: a mensagem some e nada mais acontece (formato de CPF não validado; sem regra normativa específica, ficou como incerto e não foi reportado). Tab a partir do botão levou ao link 'Login com seu banco', que tem :focus-visible e nenhuma indicação visual (a regra .link-opcao:focus remove outline e box-shadow). Clique em 'Alto Contraste': sem mudança observável (classes e fundo inalterados, nenhum aria-pressed); sem regra específica, ficou como incerto. Observações do oráculo não promovidas a achado: classes utilitárias extras, hr.br-divider (semântica nativa preservada, role=presentation), font-size 11px na tag (sem norma). A cor #dee2e6 também aparece em border-bottom de .barra-superior e .opcao-identificacao, mas o oráculo não a sinalizou nesses elementos (S-page-005); ficou como incerto e não foi reportado. Limitações: o seletor .mensagem-erro-cpf só existe depois do envio vazio; axe sem violações (36 passes); console só tem 404 de favicon.ico."
}
````

### Decisão

````json
{
  "cardId": "C-f638eb9f5c320aa45d975d4f423ed770569d75f5020ac2cb00441193ab2f9927",
  "status": "pending",
  "reviewer": "",
  "rationale": "",
  "complete": false,
  "evidenceRefs": [],
  "atoms": []
}
````
