# Tela F3 — congelamento da referência 1.0.0 (27/11/2026)

`ground-truth-processos-f3.json` 1.0.0, sha256 `14baee19d40b8818e9d44d2b00b6636b94fbaee5d79cefddedc97307ebfbd7b0`,
congelada no commit `1209423` do ramo `tela-f3` do govbr-eval (commit só com a referência). Este registro e os arquivos
selados vão no commit seguinte. Nenhuma `main` tocada, nada enviado; oráculo, axe, detectores e MCP não rodaram na F3.
O adendo 3 ainda é RASCUNHO neste dia (ver "Pontos para o adendo 3", no fim).

## Arquivos selados

| Arquivo | sha256 |
|---|---|
| `ground-truth-processos-f3.json` | `14baee19d40b8818e9d44d2b00b6636b94fbaee5d79cefddedc97307ebfbd7b0` |
| `tela-f3/estratos-1.0.0.json` (`--selar`: cita a referência congelada) | `ad48fb747aecc897f20985bda0a6994f36d00bf992f9e02441d6353e08806f54` |
| `tela-f3/criterios-de-julgamento.json` (25/25 specs; cita a referência congelada) | `7c5fa91c5b65519fa2d56949a16dea6368b423cb3711560124196d3fedf0e3d1` |
| `tela-f3/conformes.json` (9 controles) | `697a52171ee497211a2e1dbaba44625c2b78a654b17706bd84e48dfa09738053` |
| `tela-f3/classes-nat71/classes-finais.json` | `005216c576815898067a50fd27c97ba4295479fffe2891c6e838eb4dfab7015d` |
| `tela-f3/classes-d156-1.0.0.json` (ds × geral) | `c2e5de873cfded1a14bf26c6eaf6cc006ffddce47bb63f0e9d2ccf6d74f7f42f` |
| `tela-f3/pagina-congelada.json` (190 arquivos, lista `30b16f0d…`; corpus `tela-f3` `9d194d7`) | `f8b71deebd61724031be2a47409cab41f95eb3da3598bd8a4aa53277421af91d` |
| `tela-f3/auditoria-cega/chave.json` | `ffbb32010077ee1b1ad4953d1207a8940964c3e7ddfa36bbb98365106c2b4972` |
| `tela-f3/auditoria-cega/resultado.json` | `2976a89e056eb6e6ac9d7a3fb40b77ad614cd692f36fefe4d0c1ae46b417fa43` |

## As 12 semeadas

| Spec | Estado | Âncora | Contagem | Regra(s) na base | Tipo | Nível | Interação | Origem | Controle |
|---|---|---|---|---|---|---|---|---|---|
| F3-01 | sempre | `govbr-custom-pagination nav.br-pagination > ul` | 1 | pagination-4323d08f3e2d, -0a0e2ad9474e | T1 anatomia | médio | não | mantido | não |
| F3-02 | inicial | `pnip-header .br-avatar > span` | 1 | development-avatar-23d40d3d6ea4 | T1 marcação | fácil | não | mantido | não |
| F3-03 | filtro-removido | `pnip-multiple-search-table-utils div.row.pl-2:not(.align-items-center) span.br-tag.interaction` | 1 | tag-de4b72eadecf | T4 | fácil | sim | trocado | não |
| F3-04 | inicial | `pnip-mpa-processos table tbody td:nth-of-type(5)` | 1 (composição, 9 células) | table-bc0d039ca6cc, -4aac83c034bd | T4 | fácil | não | novo | não |
| F3-05 | inicial | `pnip-mpa-processos div.tab-panel > div.col > div.row:first-of-type span.br-tag.interaction` | 1 | tag-93cce777e402 | T2 | difícil | não | trocado | **sim** |
| F3-06 | inicial | `govbr-custom-pagination nav.br-pagination button[aria-label="Página seguinte"]` | 1 | — (sem id: pagination__designer.md:29) | T2 | médio | não | trocado | **sim** |
| F3-07 | inicial | `pnip-mpa-processos br-breadcrumb >>> li.crumb:last-child` | 1 | breadcrumb-c54865b466d0, accessibility-breadcrumb-53db61fa81f9 | T1 marcação | difícil | não | trocado | **sim** |
| F3-08 | inicial | `pnip-mpa-processos br-tab >>> button` | 1 (composição, 3) | tab-b717690fd662 | T3 | difícil | não | mantido | não |
| F3-09 | exibir-25 | `govbr-custom-pagination nav > div:nth-of-type(1) br-select-pnip input#total` | 1 | select-42e87c4d09d5 | T4 | fácil | sim | trocado | não |
| F3-10 | inicial | `pnip-mpa-processos table tbody br-button[disabled]` | 1 (composição, 8) | — (sem id: estados.md:234) | T4 | difícil | não | mantido | não |
| F3-11 | inicial | `pnip-mpa-processos br-tab >>> li.tab-item:first-child` | 1 | tab-50ac44341161 | T4 | médio | não | mantido | não |
| F3-12 | assinatura-cancelada | `pnip-mpa-processos div.mt-3 > br-button[icon="check"][type="primary"]` | 1 | button-a4d904dedad5 | R | muito difícil | sim | trocado | não |

Os ids da tabela são `govbr-3.7.0-component-…` (ou `-development-`/`-accessibility-`, como escrito). As justificativas de
nível e de interação estão em `tela-f3/semeadas.mjs` (uma linha por spec).

## O que foi conferido

| Item | Resultado |
|---|---|
| Confirmação cega (2 auditores, 24 afirmações, 5 iscas com interação) | 12/12 semeadas confirmadas pelos dois; 12/12 iscas falsas nos dois; 0 respostas "o juiz não decide"; 25/25 trechos de documentação literais para os dois; 0 descrições reescritas |
| NAT-71 (2 classificadores cegos + 1 de desempate) | acordo de classe 11/12 e de nível 9/12; 4 desempates pelo 3º cego (F3-02 classe; F3-04, F3-08, F3-11 nível); 0 sem maioria; 13 naturais herdadas da D |
| Classes D-156 | não expostas: 21 = 13 ds + 8 geral; as 12 semeadas são ds; expostas 4 (geral) |
| `check-reference` final na ala do corpus (`tela-f3` `9d194d7`, servida em 3340) | 0 problemas; 8/8 predicados sustentam (`conferir-referencia-1.0.0.log`) |
| Build sem semente | só os 8 predicados refutam e a âncora da F3-03 não casa (a tag sai com o ×) |
| Sonda própria (todas as paradas, dois builds) | 12/12 predicados próprios separam os builds (`sonda.json`) |
| Entrada direta × navegando | iguais nos 5 segmentos com parada, nos dois builds (`conferir-arvores.json`) |
| Naturais | evidência do código da D idêntica nos dois builds (13/13); D-11…D-14 conferidas também nas 4 paradas novas (`sonda.json › naturaisSempre`) |
| Ids × base servida | 13/13 casam; 2 sem id confirmadas (F3-06, F3-10); 19/19 ids das naturais existem |
| Estratos e critérios | aceitos pela própria bancada (`conferirEstratos`, `criteriosParaOJuiz`, `regraDaTela`: primário 12) |

## Regras repetidas (declaradas, não filtradas)

- F3-01 (2 ids), F3-02, F3-08, F3-11: as mesmas regras das specs F2-01, F2-02, F2-08, F2-11 da F2.
- F3-10: a mesma cláusula sem id da F2-10.
- F3-04 (2 ids): as mesmas regras da spec F-01 da F.
- F3-12: `component-button-a4d904dedad5` aparece na referência da A2 só na medida de um controle conforme (`_meta.conformes.itens[10].medida`, o chamariz do "Voltar"), sem ser regra de spec.
- F3-05, F3-06, F3-07 e F3-03, F3-09: nenhuma repetição nas referências de A, A2, B, D, E, F e F2.

## Decisões desta referência (vetáveis)

1. **Estados em segmentos próprios.** Cada estado novo tem um segmento depois de ida e volta pela rota de vistorias
   (9 segmentos, paradas em 0, 2, 4, 6, 8); a ordem evita o que a página guarda na sessão ("Meus processos" desligado,
   filtro escolhido): nenhum segmento desliga "Meus processos" e o do filtro é o último.
2. **F3-01 com `state: "sempre"`** e uma parada na página 2 de "Concluídos": é a forma fiel de "qualquer página" que o
   formato aceita (a unidade existe em todas as paradas; o critério dá crédito em qualquer página ou aba).
3. **Casos de comportamento sem predicado** (F3-03, F3-09, F3-12, como a F2-01): nenhuma espécie implementada mede o
   efeito de um clique, o valor de um campo ou a relação rótulo × ação. A separação dos builds é a da sonda própria; a da
   F3-03 aparece também na conferência da bancada (a âncora não casa no sem semente). Critério C-7: o comportamento em
   qualquer estado equivalente leva o crédito.
4. **F3-12 com o diálogo no setup** (marcar a 2ª linha, abrir, Cancelar). O scanner e a linha de base vão repetir esse
   clique em Cancelar; nunca em Assinar.
5. **F3-04 como composição** (1 unidade, 9 participantes), como a F2-08/F2-10: uma regra corta a coluna inteira; o relato
   de qualquer célula leva o crédito. O pedido dizia "contagem = as células da coluna": ficou em `participantCount` 9.
6. **F3-07 com dois ids** (a cláusula do designer e a de acessibilidade do Breadcrumb, as duas literais). Predicado:
   falta de `data-active` no último item.
7. **Categorias no vocabulário ds** (`componente`, `estrutura`, `comportamento`, `token`, `tipografia`): a F3-07 e a
   F3-09 saíram de `navegacao` e `formulario`, que puxariam para geral e a regra da bancada recusa.
8. **Conformes: 9.** Saem os três pares do breadcrumb (M-07), o das abas (M-08/M-11) e o `item-superficie`, cuja medida
   da D lê o campo do "Exibir" que a M-09 congela (achado da re-medida).
9. **Natural conhecido e não catalogado**, declarado em `fora_de_escopo`: na parada pagina-2 o campo do seletor "Página"
   fica em 1 (igual nos dois builds).
10. **Níveis** atribuídos aqui: 4 fáceis (02, 03, 04, 09), 3 médios (01, 06, 11), 4 difíceis (05, 07, 08, 10), 1 muito difícil (12).
    Mantidos ficaram com o nível da F2. F3-05 foi de médio para difícil depois da sonda: as tags de filtro vizinhas são
    brancas, não servem de comparação.

## Limites

1. Lista escolhida pela autora, que conhece o oráculo; não sorteada nem curada às cegas (adendo 3 § 2, § 8).
2. 9 controles conformes, não 12.
3. Uma natural (D-14) reancorada no mesmo elemento, a mesma troca da F2.
4. Os níveis NAT-71 das 4 mantidas com predicado (F3-02, F3-08, F3-10, F3-11) saíram `a`; na F2 as mesmas specs saíram
   `b` (e a F2-08 `semântico`, a F3-08 `layout/visual`). A diferença é de leitura dos classificadores sobre o que conta
   como "predicado implementado em ferramenta" (os da F3 contaram o predicado de aceitação da referência). A regra é
   mecânica e foi seguida; o registro fica para a autora.
5. Pacotes da auditoria e da NAT-71 montados sobre o rascunho; as 12 semeadas do pedido NAT-71 são idênticas às da
   referência congelada (conferido em `fechar-1.0.0.mjs`); as afirmações da auditoria são textos próprios, não as descrições.

## Pontos para o adendo 3 (antes de congelá-lo)

Nada do que foi medido contradiz o adendo. Ajustes de redação sugeridos:

1. § 3, primeira frase: "a cláusula e o id de cada um ficam na referência" → "a cláusula de cada um e, quando a base
   congelada tem registro, o id". As cláusulas dos casos 06 (`pagination__designer.md`, linha 29, "Botão Circular") e 10
   (`estados.md`, linha 234) não têm id na base 3.7.12.
2. § 3, último item das regras repetidas: o resultado da conferência dos casos 05, 06 e 07 contra A, A2, B, D e E (e F,
   F2) é "nenhuma repetição"; pode entrar no texto.
3. § 3, estado do caso 09: "depois de escolher 25" numa lista de mais de 10 itens (a referência usa a aba
   "Concluídos", 14 itens); na lista da carga (9 itens) a tabela não muda e o "atualiza a tabela" não se vê.
4. § 3, estado do caso 12: "aba Tramitando" → "a lista da carga (a de Tramitando, com 'Meus processos' ligado)", porque
   a aba marcada como ativa na carga é "Aguardando análise" (caso 11).
5. Os pontos da página da bancada (`bancada-tela-f3-2026-11-27.md` § 9: subtipo no § 7, id e precedência do tipo R,
   regra do controle não marcado, nome do formato) continuam valendo.
