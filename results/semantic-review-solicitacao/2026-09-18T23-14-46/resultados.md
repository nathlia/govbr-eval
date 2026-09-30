# Resultados — bateria v02 da tela de fluxo

Pontuação `flow-semantic-1.4.0` · pacote `d041e249da08` · decisões `3a97417bd7ac`

Todos os números desta página saem de UMA execução do scorer sobre o pacote acima. Não há
fórmula mantida em paralelo: quem discordar do scorer discorda desta página também.

## Por execução

| Execução | Braço | Estado | Detectadas | Revocação | Precisão | F1 | Citação | Novas | Falsas | Sem resolver | US$ | s | Turnos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `axe` | linha-de-base | complete | 1/14 | 7.1% | 100.0% | 13.3% | 100.0% | 0 | 0 | 0 | US$ 0.0000 | 0.8 | — |
| `validator-nao-guiada` | linha-de-base | complete | 2/14 | 14.3% | 22.2% | 17.4% | 36.4% | 2 | 7 | 0 | US$ 0.0000 | 2.5 | — |
| `agent-2026-09-18T23-14-46-sem-run1-7e66c8d8.json` | sem-oraculo | complete | 5/14 | 35.7% | 83.3% | 50.0% | 75.0% | 2 | 1 | 0 | US$ 8.1447 | 1109.2 | 114 |
| `agent-2026-09-18T23-14-46-sem-run2-a967f5af.json` | sem-oraculo | complete | 6/14 | 42.9% | 100.0% | 60.0% | 100.0% | 2 | 0 | 0 | US$ 5.3137 | 590.8 | 71 |
| `agent-2026-09-18T23-14-46-sem-run3-df62a1d7.json` | sem-oraculo | complete | 5/14 | 35.7% | 100.0% | 52.6% | 85.7% | 2 | 0 | 0 | US$ 3.4852 | 453.0 | 75 |
| `agent-2026-09-18T23-14-46-com-run1-724f34c9.json` | com-oraculo | complete | 5/14 | 35.7% | 100.0% | 52.6% | 100.0% | 3 | 0 | 0 | US$ 5.6325 | 586.2 | 74 |
| `agent-2026-09-18T23-14-46-com-run2-7824e8ff.json` | com-oraculo | complete | 4/14 | 28.6% | 100.0% | 44.4% | 100.0% | 45 | 0 | 0 | US$ 3.9485 | 513.8 | 50 |
| `agent-2026-09-18T23-14-46-com-run3-9b860cda.json` | com-oraculo | complete | 5/14 | 35.7% | 83.3% | 50.0% | 64.3% | 8 | 1 | 0 | US$ 6.4166 | 639.0 | 79 |

## Por braço

| Braço | n | Revocação média | DP | Precisão média | F1 médio | Detectadas média | US$ total | s médio | Turnos médio |
|---|---|---|---|---|---|---|---|---|---|
| com-oraculo | 3 | 33.3% | 4.1% | 94.4% | 49.0% | 4.7 | US$ 15.9976 | 579.7 | 67.7 |
| sem-oraculo | 3 | 38.1% | 4.1% | 94.4% | 54.2% | 5.3 | US$ 16.9436 | 717.7 | 86.7 |

O desvio-padrão é amostral e descreve a dispersão entre as execuções deste braço. **Nenhum teste
inferencial é aplicado**: três execuções por braço é o que cabe no orçamento desta pesquisa, e foi
declarado como estudo de caso antes da coleta, não como limiar de suficiência.

## Citação, separada da detecção

| Braço | Citação média | Detectadas média | Falsas revisadas | Sem resolver |
|---|---|---|---|---|
| com-oraculo | 88.1% | 4.7 | 1 | 0 |
| sem-oraculo | 86.9% | 5.3 | 1 | 0 |

Citar a norma certa não prova detecção, e detectar sem citação mecanicamente válida não é falso
positivo. **Falsas revisadas** e **sem resolver** ficam em colunas diferentes de propósito: uma é
alegação julgada errada; a outra é dúvida que ninguém decidiu ainda.

## Cobertura por família e por unidade

| Spec | Unidades | com-oraculo (máx.) | sem-oraculo (máx.) | com-oraculo (execuções que detectaram) | sem-oraculo (execuções que detectaram) |
|---|---|---|---|---|---|
| A-01 | 1 | 0 | 0 | 0/3 | 0/3 |
| A-02 | 1 | 1 | 1 | 3/3 | 3/3 |
| A-03 | 1 | 0 | 0 | 0/3 | 0/3 |
| A-04 | 2 | 0 | 2 | 0/3 | 1/3 |
| A-05 | 1 | 1 | 0 | 1/3 | 0/3 |
| A-06 | 1 | 1 | 0 | 1/3 | 0/3 |
| A-07 | 1 | 0 | 0 | 0/3 | 0/3 |
| A-08 | 2 | 2 | 2 | 3/3 | 3/3 |
| A-09 | 1 | 1 | 1 | 3/3 | 3/3 |
| A-10 | 1 | 0 | 0 | 0/3 | 0/3 |
| A-11 | 1 | 0 | 0 | 0/3 | 0/3 |
| A-12 | 1 | 0 | 1 | 0/3 | 3/3 |

Instâncias repetidas da mesma spec são **oportunidades de cobertura**, não telas independentes:
uma spec com oito instâncias pesa oito no denominador de unidades e uma na contagem de famílias.

## Contra a linha de base determinística

| Agente | Linha de base | Estado | Ambos | Só agente | Só linha de base | Nenhum |
|---|---|---|---|---|---|---|
| `agent-2026-09-18T23-14-46-sem-run1-7e66c8d8.json` | linha-de-base/axe | complete | 1 | 4 | 0 | 9 |
| `agent-2026-09-18T23-14-46-sem-run1-7e66c8d8.json` | linha-de-base/validator-nao-guiada | complete | 0 | 5 | 2 | 7 |
| `agent-2026-09-18T23-14-46-sem-run1-7e66c8d8.json` | uniao-deterministica | complete | 1 | 4 | 2 | 7 |
| `agent-2026-09-18T23-14-46-sem-run2-a967f5af.json` | linha-de-base/axe | complete | 1 | 5 | 0 | 8 |
| `agent-2026-09-18T23-14-46-sem-run2-a967f5af.json` | linha-de-base/validator-nao-guiada | complete | 0 | 6 | 2 | 6 |
| `agent-2026-09-18T23-14-46-sem-run2-a967f5af.json` | uniao-deterministica | complete | 1 | 5 | 2 | 6 |
| `agent-2026-09-18T23-14-46-sem-run3-df62a1d7.json` | linha-de-base/axe | complete | 1 | 4 | 0 | 9 |
| `agent-2026-09-18T23-14-46-sem-run3-df62a1d7.json` | linha-de-base/validator-nao-guiada | complete | 0 | 5 | 2 | 7 |
| `agent-2026-09-18T23-14-46-sem-run3-df62a1d7.json` | uniao-deterministica | complete | 1 | 4 | 2 | 7 |
| `agent-2026-09-18T23-14-46-com-run1-724f34c9.json` | linha-de-base/axe | complete | 1 | 4 | 0 | 9 |
| `agent-2026-09-18T23-14-46-com-run1-724f34c9.json` | linha-de-base/validator-nao-guiada | complete | 0 | 5 | 2 | 7 |
| `agent-2026-09-18T23-14-46-com-run1-724f34c9.json` | uniao-deterministica | complete | 1 | 4 | 2 | 7 |
| `agent-2026-09-18T23-14-46-com-run2-7824e8ff.json` | linha-de-base/axe | complete | 1 | 3 | 0 | 10 |
| `agent-2026-09-18T23-14-46-com-run2-7824e8ff.json` | linha-de-base/validator-nao-guiada | complete | 0 | 4 | 2 | 8 |
| `agent-2026-09-18T23-14-46-com-run2-7824e8ff.json` | uniao-deterministica | complete | 1 | 3 | 2 | 8 |
| `agent-2026-09-18T23-14-46-com-run3-9b860cda.json` | linha-de-base/axe | complete | 1 | 4 | 0 | 9 |
| `agent-2026-09-18T23-14-46-com-run3-9b860cda.json` | linha-de-base/validator-nao-guiada | complete | 1 | 4 | 1 | 8 |
| `agent-2026-09-18T23-14-46-com-run3-9b860cda.json` | uniao-deterministica | complete | 2 | 3 | 1 | 8 |

## Esforço de avaliação — não é custo de operação

Cartões únicos: **60** · sujeitos: 105 · sem evidência verificada: 55 · com unidade candidata: 40.

Estimativa: **345 min** (3 min/cartão +3 sem evidência — DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui).

Nenhum orçamento de revisão foi declarado para este pacote.

Isto é o que custou **medir**, e fica separado do que custaria **operar** o agente — as duas
contas respondem a perguntas diferentes e somá-las não significaria nada.

## Fechamento

| Fila | Quantidade | Efeito |
|---|---|---|
| Ativa (desta bateria) | 0 | **Fecha a bateria.** Enquanto houver um, tudo é provisório |
| Histórica (outras baterias) | 0 | Dívida declarada; não cobra desta |
| Descobertas para a próxima referência | 21 | Entram na próxima versão do gabarito |

**Bateria fechada.** Todas as alegações foram decididas; os números acima são finais sob este gabarito e este contrato de pontuação.

