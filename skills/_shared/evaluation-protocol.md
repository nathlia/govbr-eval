# Protocolo canônico de avaliação de interfaces

Use este procedimento para avaliar conformidade e acessibilidade de uma interface observável em
execução. Ele define somente o método; regras, tokens e especificações pertencem ao oráculo quando
ele estiver disponível.

## Limites de validade

- Avalie apenas URLs e escopos dados na invocação. Não leia fonte, gabaritos, resultados, relatórios,
  documentação do projeto nem versões anteriores destes protocolos.
- Não suponha que existam defeitos, nem que exemplos oficiais estejam corretos. Falso positivo e
  falso negativo contam contra a avaliação.
- A ausência do oráculo é uma condição experimental deliberada. Não tente contorná-la e não invente
  identificadores de regra.
- Use identificadores exatos retornados pelo oráculo quando existirem. Fora dele, use somente uma
  referência normativa que consiga justificar; se a atribuição for incerta, declare isso.

## Algoritmo

1. Descubra as regiões, os estados e os controles a partir da interface, sem procurar um mapa no
   repositório. Tire snapshot da árvore de acessibilidade e observe DOM, texto e estilos relevantes.
2. Mantenha um ledger curto por estado: estado/fingerprint, elemento, observação, regra candidata,
   evidência já coletada e situação `aceito`, `rejeitado` ou `incerto`.
3. Opere a tela. Use mouse e teclado, preencha e envie formulários, abra e feche componentes e
   confira foco, nomes, papéis, mensagens e mudanças de estado. Registre no relatório o que tentou.
4. Se `scan_page` estiver disponível, faça uma varredura compacta por estado. Reproduza interações
   em `actions`, pois navegadores de servidores MCP diferentes não compartilham estado. Guarde
   `scanId` e fingerprint; use `compareToScanId` no estado seguinte.
5. Decida primeiro com os resumos. Recupere evidência pelos ids de finding; use objetos completos só
   quando outro contrato exigir. Continue respostas truncadas pelo mesmo `scanId`, sem repetir a
   varredura.
6. Consulte regras em lote e na projeção breve. Busque detalhe completo apenas para candidatos cuja
   aplicabilidade ainda esteja ambígua. Verifique achados heurísticos quando a ferramenta de
   verificação estiver disponível.
7. Faça uma passada final entre regiões para relações que não aparecem isoladamente. Confira cada
   seletor na página e produza o resultado diretamente do ledger.

## Orçamento e parada

- Uma varredura por estado inalterado. Agrupe seletores, ids e regras; solicite apenas propriedades
  necessárias. Nunca refaça evidência ainda válida.
- Depois de 12 investigações detalhadas no mesmo estado, registre por que outra é necessária antes
  de continuar.
- Encerre quando o escopo foi percorrido e todo candidato estiver aceito, rejeitado ou explicitamente
  incerto. Falha, timeout e truncamento não desaparecem: registre a limitação.

O runner acrescenta `config`, tempo, chamadas, tokens e custo ao artefato arquivado. Não conte
chamadas nem estime custo manualmente. Gere o timestamp final no momento de salvar.
