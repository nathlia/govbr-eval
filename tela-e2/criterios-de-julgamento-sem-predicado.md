# Tela E2: critérios de julgamento fixados antes da coleta para as specs sem predicado

**Data:** 16/11/2026. **Coleta:** ainda não começou. Nenhum agente rodou sobre a tela.

**Referência:** `ground-truth-cadastro-pais.json` 1.0.0, commit `4f200f2`, sha256
`661cc54b7b291bc6e455065ecb23c08e5279bf7a0e9c7d6494afd78ae112c528`. A referência não foi alterada.

**Dados completos:** `criterios-de-julgamento-sem-predicado.json`, ao lado deste arquivo. O JSON traz as fontes de
cada item e o sha256 de cada arquivo lido.

## Por que este arquivo existe

A referência tem 8 specs. Cinco delas têm predicado de aceitação implementado. Três não têm (`porSpec.<U>.aceitacao`,
commit `a84b504`). Um revisor independente e a autora aceitam julgar essas três pela descrição, desde que três coisas
fiquem escritas antes da coleta:

- o observável;
- o estado em que ele é observado;
- o critério de decisão.

Este arquivo escreve esses três itens. Cada um foi citado ou derivado só do que já estava medido e registrado: a
conferência de construção, a auditoria cega, a re-medida, a reconciliação e a cláusula sorteada.

Este arquivo não muda o que a referência cobra: specs, unidades, `rules`, estados, classes e portão continuam iguais.
Quando um item não sai dos registros sem uma decisão nova, ele fica marcado `nao-fixavel-sem-decisao`, com a
indicação do que falta.

**O que não foi feito:** nenhuma medição nova, nenhum navegador, nenhuma ferramenta do validator, nenhum axe e nenhum
modelo. Nenhum arquivo existente foi alterado.

## Critérios comuns (valem para todas as specs)

| Id | Critério | Fonte |
|---|---|---|
| C-1 | A unidade é (elemento × defeito) no estado aplicável. Há acerto quando a alegação afirma o defeito daquela unidade, naquele elemento ou composição, num estado em que a unidade foi medida. | `_meta.unit_of_evaluation`; `docs/semantic-scoring.md` |
| C-2 | Citar norma de `rules` sem mostrar o defeito da unidade (o observável, no hospedeiro e no estado) não dá crédito. | `_meta.coviolacoes.condicoes[2]` |
| C-3 | Pela R-CV, as regras adicionais de `rules` são o mesmo defeito no mesmo hospedeiro. Uma alegação que mostra o observável registrado de qualquer regra da spec é acerto da mesma spec. A unidade é creditada no máximo uma vez. | `reconciliacao.md` § 5; `porSpec.<U>.coviolacoes.emRules[].observavel`; `docs/semantic-scoring.md` |
| C-4 | A detecção não depende de id. Uma alegação que afirma o defeito e cita só id exposto conta como "fundamentada por norma exposta", nunca como (i). | `_meta.fundamentacao` |
| C-5 | Uma alegação sobre condição listada em `_meta.fundo` ou em `fora_de_escopo` não é acerto de spec. Se estiver correta, conta como descoberta. | `_meta.fundo`, `_meta.fora_de_escopo` |
| C-6 | O desfecho `nao-implementado` não é aceitação nem recusa. A revisora lê a afirmação. Não se dá crédito só porque a reconstrução mostra o defeito. Quando falta evidência, a decisão é `evidencia-insuficiente`. | `docs/semantic-scoring.md` § Predicados, § Proveniência |
| C-7 | No mesmo hospedeiro há obrigações medidas conformes: pelas iscas do 2º auditor cego (10/10 `satisfaz`) ou pela conferência de construção. Alegar a violação de uma delas não é acerto da spec. | `remedida-mapa.json`; `reconciliacao.md` § 7; `conferir-construcao.mjs` |

## Specs sem predicado na referência principal

### U-02 (DS): todos os itens fixados

- **Observável.**
  - Elemento: o corpo da mensagem informativa de orientação, `#msg-orientacao .message-body`, unidade única.
    A 1ª auditoria ancorou em `#msg-orientacao`, e a reconciliação tratou essa âncora como o mesmo hospedeiro.
  - O que se olha: o texto do corpo usa jargão de sistema, sem explicação. Foram medidos 7 termos técnicos.
  - Fontes: `conferir-construcao.mjs` linhas 173–174 e 188, `conferir-aditiva.mjs` linha 36,
    `auditoria/achados.json` › EA-10 e EA-11, e `elegibilidade-passo2.json` › a2-d6b3f0e36943.
- **Estado.** "sempre": S0, S1 e S2, alcançados pelo `setup` aditivo. O texto não muda entre os estados. Foi medido
  nos três estados pelo caminho aditivo e pela auditoria (EA-10, de S0 a S2).
- **Critério.**
  - Há acerto quando a alegação afirma que o corpo desta mensagem usa jargão técnico ou de sistema (linguagem que
    não é simples, ou termos técnicos sem explicação), num dos estados S0–S2.
  - Nenhum registro fixa um número mínimo de termos para a alegação. O limiar de ≥ 3 é da conferência sobre a
    página, não do juiz.
  - **Não contam:**
    - citar a norma sem afirmar o jargão (C-2);
    - dizer só que o texto é longo ou pouco objetivo, sem mostrar o jargão: o observável registrado das 3 regras é
      o jargão;
    - estrangeirismos sem `lang` (EI-14, fundo, item 11a);
    - o foco ao exibir ou ao fechar a mensagem (EI-12 e EI-13, fundo);
    - a cor, a posição, o comportamento a 200 % e o visual de estado da mensagem (iscas R-02, R-08, R-04 e R-13,
      todas conformes);
    - apontar `#msg-erro`, que é outro elemento.

### U-03 (DS): todos os itens fixados

- **Observável.**
  - Elemento: o botão circular `#btn-ajuda`, unidade única.
  - O que se olha: nenhum ícone visível. A medida deu 0 elemento de ícone visível e 0 pixel não branco em repouso.
    O nome acessível "Ajuda sobre o cadastro" continua lá, e o tamanho continua 40×40.
  - Fontes: `conferir-construcao.mjs` linhas 118, 181, 189 e 343–345, `conferir-aditiva.mjs` linha 37,
    `auditoria/achados.json` › EA-03, e `elegibilidade-passo2.json` › a2-5b47246a41c1.
- **Estado.** "sempre": S0, S1 e S2, em repouso, pelo `setup` aditivo. Não é preciso interagir com o botão. Foi
  medido nos três estados (caminho aditivo e EA-03).
- **Critério.**
  - Há acerto quando a alegação afirma que este botão circular está sem ícone (círculo vazio, sem ícone que exprima
    a ação), num dos estados S0–S2. A alegação pode vir junto com "sem texto visível".
  - **Não contam:**
    - citar a cláusula sem afirmar a falta de ícone neste botão (C-2);
    - dizer só "sem texto visível": todos os observáveis de `rules` são "0 ícone visível";
    - a falta de nome acessível: o nome foi medido;
    - o tamanho, a ênfase e a distância do título, medidos conformes;
    - o tooltip ou o efeito do clique (EI-01, fundo);
    - apontar o Fechar da mensagem ou o gatilho do select, que são outros elementos (o gatilho é o EI-08, fundo).

### U-08 (G): todos os itens fixados

- **Observável.**
  - Elemento: o campo "Nome do país", `#nome-pais`, unidade única. A 1ª auditoria ancorou no contêiner
    `#inp-nome-pais`, e a reconciliação tratou essa âncora como o mesmo hospedeiro.
  - O que se olha: com foco por Tab, o texto digitado não entra no campo (o valor fica vazio). O campo só é liberado
    por clique de ponteiro.
  - Fontes: `conferir-construcao.mjs` linhas 200–206, `auditoria/achados.json` › EA-04 e EA-05, e
    `elegibilidade-passo2.json` › a2-328f62cfe4ce.
- **Estado.** "sempre": S0, S1 e S2, pelo `setup` aditivo. Dentro do estado, a observação é focar o campo por Tab e
  digitar: esse é o método de observação, não uma parada do `setup`. O comportamento foi medido em S0 na construção e
  de S0 a S2 na auditoria. O caminho aditivo conferiu que o `readonly` está presente nos três estados.
- **Critério.**
  - Há acerto quando a alegação afirma que o campo não aceita digitação logo depois do foco por teclado, ou que só é
    liberado por ponteiro e não por teclado, num dos estados S0–S2.
  - **Não contam:**
    - apontar só a presença do `readonly`, sem a consequência (`porSpec.U-08.aceitacao`: "o readonly presente não é
      o defeito por si");
    - citar a norma sem mostrar o comportamento (C-2). Se a alegação cita só o e-MAG 2.1, ela conta como
      "fundamentada por norma exposta" (C-4);
    - o foco inicial no 1º campo (EI-05, fundo);
    - o contraste (isca R-06, conforme);
    - o estado de erro do campo em S1, medido conforme;
    - apontar `#codigo-pais`, que é outro elemento.

## Spec só na variante `comU09`

### U-09 (G): os três itens são `nao-fixavel-sem-decisao`

- **Observável.**
  - O que já está fixado: o elemento e o localizador, `#lst-paises .item-pais` (composição de 4 participantes).
  - O que falta: decidir qual observável decide o acerto. Os registros apontam dois e se contradizem:
    - (i) **Perda de conteúdo a 200 %:** tinta cortada, sobreposição ou barra horizontal. Segundo a adjudicação, é o
      observável da cláusula sorteada. Todas as medições de tinta e de rolagem deram conforme.
    - (ii) **Altura fixa com `overflow: hidden`:** a altura do item não acompanha o conteúdo. É o observável da
      co-violação DS e da descrição da spec. A adjudicação diz que é um substituto.
- **Estado.**
  - O defeito descrito só existe a 640×450. Nos registros, essa janela foi alcançada trocando o tamanho da janela
    depois de S2. Ela não é parada do `setup`, não está em `_meta.states`, e a `viewport` da referência é 1280×900.
    No pacote, uma largura fora do plano não ancora unidade.
  - O que falta: declarar se e como a variante julga alegações feitas a 640×450, e se uma alegação feita a 1280×900
    sobre a altura fixa conta.
- **Critério.** Depende das duas decisões acima. Por enquanto, só o que já vale para todas: C-1 a C-7, e apontar a
  mensagem de orientação a 200 % não conta (isca R-04).

## Specs com predicado: o predicado não fixa os três itens (5 de 5 precisaram da linha)

Os predicados medem a troca semeada e sustentam a spec. Nenhum deles credita alegação (`docs/semantic-scoring.md`;
`congelamento-1.0.0.md` › Riscos). Por isso nenhum fixa o critério. Em 4 dos 5, a propriedade medida também não
cobre o observável inteiro.

| Spec | Observável | Estado | Critério |
|---|---|---|---|
| U-01 | `#btn-limpar`: o secundário fica à direita do primário (x 525,1 > 509,1). Pela R-CV, contam também a ordem visual diferente da ordem de Tab e a primária fora da posição mais à direita. | sempre (S0–S2) | Há acerto quando a alegação afirma um desses fatos sobre Limpar e Salvar. Não contam a norma sem a posição e o Cancelar (K-05). Se a alegação cita só o e-MAG 1.4 ou o 6.3, conta como fundamentada por norma exposta. |
| U-04 | `#inp-codigo`: rótulo, campo e apoio em Arial (declarada e usada), não em Rawline. | sempre (S0–S2) | Há acerto quando a alegação afirma, neste campo, uma família de fonte diferente da do DS. Não contam a fonte do campo do nome (medida em Rawline), o espaçamento do apoio (F-01, já conforme) e a norma sem a família. |
| U-05 | `#rad-situacao legend`: o texto começa centrado no grupo (296,1 px), e as opções começam em 62 px. A caixa da legenda fica em 62 px. | sempre (S0–S2) | Há acerto quando a alegação afirma que o texto da legenda está centralizado ou desalinhado das opções. Não contam a caixa da legenda (EC-062, conforme) e a norma sem o alinhamento. |
| U-06 | `#msg-erro`: o fundo do estado Selecionado (#2670e8) e o ícone fa-check visível. | S1 (Salvar com o formulário vazio); continua em S2 | Há acerto quando a alegação afirma, na mensagem de erro em S1 ou S2, o fundo do Selecionado (uma cor que não indica erro) ou a marca de check. Não contam alegação em S0 (a mensagem está oculta) e alegação sobre a mensagem de orientação (R-13). |
| U-07 | `#sel-continente .br-list .br-item label` (6 participantes): opções em #AAAAAA sobre branco, contraste 2,32:1. O item selecionado mantém a cor do core. | S2 (lista aberta) | Há acerto quando a alegação afirma contraste insuficiente ou cor fora da paleta nas opções da lista aberta. Não contam a lista fechada, o ícone do gatilho (EI-08) e o role ou a abertura do select (EI-06, EI-07). Se a alegação cita só o e-MAG 4.1 ou a regra da paleta, conta como fundamentada por norma exposta. |

## Contagens

| Grupo | Specs | Resultado |
|---|---|---|
| Sem predicado na referência principal | U-02, U-03, U-08 | 3 de 3 com os três itens fixados a partir dos registros |
| Sem predicado, só na variante `comU09` | U-09 | os três itens `nao-fixavel-sem-decisao` |
| Com predicado | U-01, U-04, U-05, U-06, U-07 | 5 de 5 precisaram da linha |
