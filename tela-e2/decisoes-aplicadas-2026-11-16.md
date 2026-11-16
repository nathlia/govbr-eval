# Tela E2: decisões da autora aplicadas (2026-11-16, D-202)

Decisões de 16/11 sobre `decisoes-da-autora.md`: opção **a** dos itens 2, 3, 6, 7, 8, 9, 10 e 11; itens 1, 4, 5 e 12
são só registro; U-09 pela adjudicação isolada (opção a). As condições do revisor independente, aceitas pela autora,
estão aplicadas abaixo. Nada aqui mudou semente, sorteio, variante, âncora ou estado.

Gerador: `node tela-e2/montar-referencia-1.0.0.mjs` (lê o rascunho `referencia-rascunho.json` 0.9.0 e grava
`referencia-candidata.json`, 1.0.0-candidata; com `--congelar`, grava `ground-truth-cadastro-pais.json` na raiz).

| Item | O que mudou | Onde |
|---|---|---|
| 1 | Só registro. U-06 conta pela regra da re-medida (R-11), sem precisar contar "outra cláusula". | `porSpec.U-06` (sem mudança) |
| 2a | U-04 conta como mesma cláusula pela duplicata julgada e selada antes do sorteio. Ficam ligados num registro só: a frase citada pelo auditor (EA-06, unidade `a2-f82d600db413`), a frase sorteada (`a2-a39f3ad397d4`) e o julgamento selado (`duplicada:a2-a39f3ad397d4`, justificativa e lote do passo 2; selo `c2de436`, sorteio `479e730` depois dele). A decisão vale pela equivalência, precise o portão dela ou não. | `porSpec.U-04.decisao.equivalencia` |
| 3a | Regra uniforme: frase sorteada na cláusula principal **ou** em `tambem`, no mesmo hospedeiro, estado e observável, conta como mesma cláusula. Vale para todas as specs. | `_meta.regraMesmaClausula`; `porSpec.U-02.decisao` |
| 4 | Só registro. U-05 fica e conta pela re-medida (R-05). | `porSpec.U-05` (sem mudança) |
| 5 | Só registro, superado pela adjudicação da U-09 (linha "U-09" abaixo). | — |
| 6a | Co-violações obrigatórias e inseparáveis ficam como regras adicionais da mesma spec. Cada uma das 17 (16 na principal, 1 na variante com U-09) ganhou o observável e o vínculo com a troca semeada. Specs e unidades não aumentam. Escrito que citar uma norma de `rules` sem mostrar o defeito daquela unidade não dá crédito. | `porSpec.<U>.coviolacoes.emRules[]` (`observavel`, `vinculo`, `exposto`); `_meta.coviolacoes.condicoes` |
| 7a | Ids expostos ficam em `rules`, marcados. Fixados agora, antes da coleta: versão principal = com os ids expostos marcados; sensibilidade = sem eles. Onde a unidade pode ser fundamentada por norma do DS não exposta e também por norma já exposta (U-01, U-07, U-08), a contagem separa "detectou o defeito do DS" de "fundamentada por norma exposta". | `_meta.fundamentacao`; `_meta.sensibilidades.semIdsExpostos`; `_meta.coviolacoes.idsExpostos` |
| 8a | Os 5 controles ficam como negativos declarados, com a ressalva escrita: a regra de seleção deles foi escrita depois de ver a cobertura da auditoria; a taxa de falso alarme sobre eles é descritiva e condicionada a essa seleção. | `_meta.conformes.selecao`; desvio `DV-03` |
| 9a | Correção F-02 na página: instrução geral no formulário. Diff guardado; build, conferência de construção e re-medida por script nos três estados, com o caminho aditivo S0 → S1 → S2. Nenhuma semente tocada. | `_meta.correcoesDaPagina`; `pagina-congelada.json`; corpus-e (commit no registro de congelamento) |
| 10a | EI-08 fica como fundo, documentando o comportamento e a versão do core (3.7.0); sem afirmar conformidade normativa por ser exemplo do core. | `_meta.fundo` |
| 11a | EI-14 fica fora de `rules`: respeita o `nao-se-aplica` selado do e-MAG 3.2; elegibilidade não é alargada. | `_meta.fundo` |
| 12 | Só registro: S2 depois de S1 na sequência aditiva. | desvio `DV-02` |
| U-09 (a) | Veredito do adjudicador isolado: `violacao-nao-demonstrada` (`adjudicacao-u09/veredito.json`, sha256 `648daf9528c12f9d42aa951701350778c4704453a8fa73817c2f31d47c1f271d`). A U-09 sai do denominador de positivos da referência principal. Desvio registrado de forma visível: o quê, por quê, data (16/11), que é unidade geral e não toca o portão do DS. A spec inteira fica na variante de sensibilidade declarada "com U-09". | `violations` (8 specs); `_meta.desvios` `DV-01`; `_meta.sensibilidades.comU09`; `porSpec.U-09.decisao` |
| Portão | Ficam os dois números: 4 de 6 pela 1ª auditoria sozinha; 6 de 6 pela regra combinada com a re-medida. Data em que a regra da re-medida foi fixada: 14/11, antes da medida (`remedida-mapa.json`, eval `6d456bd`; saída do 2º auditor só em `4dc0b2c`). | `_meta.portao` |

## Resultado

Referência principal: **8 specs (6 DS + 2 G), 8 unidades**, 3 estados (S0 → S1 → S2), 5 controles conformes.
Variantes de sensibilidade declaradas: `semIdsExpostos` (3 specs com `rules` reduzido) e `comU09` (9 specs).
