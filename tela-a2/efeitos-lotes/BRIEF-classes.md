# Segunda passada: classificar cada acoplamento suspeito do seu lote

Critério (decisão do coordenador, uniforme para os 6 lotes). A pergunta é se a mutação cria um SEGUNDO DEFEITO
DISTINTO na página, não se o mesmo fato também contraria uma segunda frase do DS.

Para cada item de `acoplamentoSuspeito` no SEU arquivo de saída, acrescente dois campos:
- `"classe"`: um de
  - `"distinto"`: a mutação deixa NÃO conforme um OUTRO observável — outro nó, outra propriedade, outro estado ou
    outro comportamento além do que a variante descreve. Ex.: mudar o data-child do switch faz o checkbox principal
    perder o estado intermediário (o atributo é um fato; o estado do principal é outro). Ex.: não instanciar o
    componente desliga ao mesmo tempo teclado, abertura e estado (vários fatos).
  - `"mesmo-observavel"`: a segunda regra fala do MESMO fato que a mutação produz — o mesmo nó e a mesma
    propriedade/comportamento que a variante altera, só que por outra frase do DS (ex.: "foco invisível" contra a
    tabela de estilo do foco; tirar a superfície contra o token da superfície; remover o gatilho contra "o gatilho
    alterna o ícone"). Um auditor veria UM fato só, citável por qualquer das duas regras.
  - `"rejeitado"`: a segunda violação não é consequência necessária da variante como descrita (dá para produzir a
    variante sem violar a outra regra), ou a outra regra não se aplica a esse nó.
- `"razao"`: uma frase curta que sustente a classe. Não use as palavras detector, checker, oráculo, oracle,
  validator, busca, suporte, KB.

Não mude mais nada no arquivo (nem efeitos, nem variantes). Se perceber um acoplamento `distinto` que deixou de
registrar na primeira passada, acrescente-o com os quatro campos. Mesmas proibições do brief anterior (não abrir
validator, results/, reports/, não rodar o sorteio, não commitar). Rode de novo o validar-lote (tem de dar ok).
Relatório (≤80 palavras): quantos de cada classe e a lista dos `distinto` (variante → regra).
