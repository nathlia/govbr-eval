# Resultados — bateria v02 da tela de fluxo

Pontuação `flow-semantic-1.4.0` · pacote `5766737d749a` · decisões `b894297c9e3f`

Todos os números desta página saem de UMA execução do scorer sobre o pacote acima. Não há
fórmula mantida em paralelo: quem discordar do scorer discorda desta página também.

## Por execução

| Execução | Braço | Estado | Detectadas | Revocação | Precisão | F1 | Citação | Novas | Falsas | Sem resolver | US$ | s | Turnos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `axe` | linha-de-base | complete | 0/25 | 0.0% | — | 0.0% | — | 0 | 0 | 0 | US$ 0.0000 | 0.7 | — |
| `validator-nao-guiada` | linha-de-base | complete | 6/25 | 24.0% | 100.0% | 38.7% | 100.0% | 6 | 0 | 0 | US$ 0.0000 | 2.5 | — |
| `agent-2026-09-18T17-47-14-sem-run1-2c98a15f.json` | sem-oraculo | complete | 7/25 | 28.0% | 100.0% | 43.8% | 100.0% | 1 | 0 | 0 | US$ 2.2038 | 334.1 | 53 |
| `agent-2026-09-18T17-47-14-sem-run2-c904c3aa.json` | sem-oraculo | complete | 7/25 | 28.0% | 100.0% | 43.8% | 100.0% | 0 | 0 | 0 | US$ 2.5678 | 433.4 | 59 |
| `agent-2026-09-18T17-47-14-sem-run3-d1c7fee5.json` | sem-oraculo | complete | 7/25 | 28.0% | 100.0% | 43.8% | 87.5% | 0 | 0 | 0 | US$ 2.5339 | 380.8 | 47 |
| `agent-2026-09-18T17-47-14-com-run1-e4e67d13.json` | com-oraculo | complete | 14/25 | 56.0% | 100.0% | 71.8% | 100.0% | 1 | 0 | 0 | US$ 3.8836 | 442.5 | 57 |
| `agent-2026-09-18T17-47-14-com-run2-58b5c884.json` | com-oraculo | complete | 18/25 | 72.0% | 100.0% | 83.7% | 100.0% | 0 | 0 | 0 | US$ 5.1089 | 566.9 | 71 |
| `agent-2026-09-18T17-47-14-com-run3-cabcb59e.json` | com-oraculo | complete | 14/25 | 56.0% | 100.0% | 71.8% | 88.2% | 2 | 0 | 0 | US$ 3.7185 | 492.1 | 58 |

## Por braço

| Braço | n | Revocação média | DP | Precisão média | F1 médio | Detectadas média | US$ total | s médio | Turnos médio |
|---|---|---|---|---|---|---|---|---|---|
| com-oraculo | 3 | 61.3% | 9.2% | 100.0% | 75.8% | 15.3 | US$ 12.7110 | 500.5 | 62.0 |
| sem-oraculo | 3 | 28.0% | 0.0% | 100.0% | 43.8% | 7.0 | US$ 7.3055 | 382.8 | 53.0 |

O desvio-padrão é amostral e descreve a dispersão entre as execuções deste braço. **Nenhum teste
inferencial é aplicado**: três execuções por braço é o que cabe no orçamento desta pesquisa, e foi
declarado como estudo de caso antes da coleta, não como limiar de suficiência.

## Citação, separada da detecção

| Braço | Citação média | Detectadas média | Falsas revisadas | Sem resolver |
|---|---|---|---|---|
| com-oraculo | 96.1% | 15.3 | 0 | 0 |
| sem-oraculo | 95.8% | 7.0 | 0 | 0 |

Citar a norma certa não prova detecção, e detectar sem citação mecanicamente válida não é falso
positivo. **Falsas revisadas** e **sem resolver** ficam em colunas diferentes de propósito: uma é
alegação julgada errada; a outra é dúvida que ninguém decidiu ainda.

## Cobertura por família e por unidade

| Spec | Unidades | com-oraculo (máx.) | sem-oraculo (máx.) | com-oraculo (execuções que detectaram) | sem-oraculo (execuções que detectaram) |
|---|---|---|---|---|---|
| V-01 | 4 | 4 | 0 | 3/3 | 0/3 |
| V-02 | 1 | 0 | 0 | 0/3 | 0/3 |
| V-03a | 1 | 1 | 1 | 3/3 | 3/3 |
| V-03b | 1 | 1 | 1 | 2/3 | 3/3 |
| V-04 | 1 | 0 | 0 | 0/3 | 0/3 |
| V-05 | 4 | 4 | 4 | 3/3 | 3/3 |
| V-06 | 8 | 3 | 0 | 3/3 | 0/3 |
| V-08 | 1 | 1 | 0 | 3/3 | 0/3 |
| V-09 | 1 | 1 | 0 | 1/3 | 0/3 |
| V-10 | 1 | 1 | 0 | 2/3 | 0/3 |
| V-11 | 1 | 1 | 0 | 3/3 | 0/3 |
| V-12 | 1 | 1 | 1 | 3/3 | 3/3 |

Instâncias repetidas da mesma spec são **oportunidades de cobertura**, não telas independentes:
uma spec com oito instâncias pesa oito no denominador de unidades e uma na contagem de famílias.

## Contra a linha de base determinística

| Agente | Linha de base | Estado | Ambos | Só agente | Só linha de base | Nenhum |
|---|---|---|---|---|---|---|
| `agent-2026-09-18T17-47-14-sem-run1-2c98a15f.json` | linha-de-base/axe | complete | 0 | 7 | 0 | 18 |
| `agent-2026-09-18T17-47-14-sem-run1-2c98a15f.json` | linha-de-base/validator-nao-guiada | complete | 0 | 7 | 6 | 12 |
| `agent-2026-09-18T17-47-14-sem-run1-2c98a15f.json` | uniao-deterministica | complete | 0 | 7 | 6 | 12 |
| `agent-2026-09-18T17-47-14-sem-run2-c904c3aa.json` | linha-de-base/axe | complete | 0 | 7 | 0 | 18 |
| `agent-2026-09-18T17-47-14-sem-run2-c904c3aa.json` | linha-de-base/validator-nao-guiada | complete | 0 | 7 | 6 | 12 |
| `agent-2026-09-18T17-47-14-sem-run2-c904c3aa.json` | uniao-deterministica | complete | 0 | 7 | 6 | 12 |
| `agent-2026-09-18T17-47-14-sem-run3-d1c7fee5.json` | linha-de-base/axe | complete | 0 | 7 | 0 | 18 |
| `agent-2026-09-18T17-47-14-sem-run3-d1c7fee5.json` | linha-de-base/validator-nao-guiada | complete | 0 | 7 | 6 | 12 |
| `agent-2026-09-18T17-47-14-sem-run3-d1c7fee5.json` | uniao-deterministica | complete | 0 | 7 | 6 | 12 |
| `agent-2026-09-18T17-47-14-com-run1-e4e67d13.json` | linha-de-base/axe | complete | 0 | 14 | 0 | 11 |
| `agent-2026-09-18T17-47-14-com-run1-e4e67d13.json` | linha-de-base/validator-nao-guiada | complete | 6 | 8 | 0 | 11 |
| `agent-2026-09-18T17-47-14-com-run1-e4e67d13.json` | uniao-deterministica | complete | 6 | 8 | 0 | 11 |
| `agent-2026-09-18T17-47-14-com-run2-58b5c884.json` | linha-de-base/axe | complete | 0 | 18 | 0 | 7 |
| `agent-2026-09-18T17-47-14-com-run2-58b5c884.json` | linha-de-base/validator-nao-guiada | complete | 6 | 12 | 0 | 7 |
| `agent-2026-09-18T17-47-14-com-run2-58b5c884.json` | uniao-deterministica | complete | 6 | 12 | 0 | 7 |
| `agent-2026-09-18T17-47-14-com-run3-cabcb59e.json` | linha-de-base/axe | complete | 0 | 14 | 0 | 11 |
| `agent-2026-09-18T17-47-14-com-run3-cabcb59e.json` | linha-de-base/validator-nao-guiada | complete | 6 | 8 | 0 | 11 |
| `agent-2026-09-18T17-47-14-com-run3-cabcb59e.json` | uniao-deterministica | complete | 6 | 8 | 0 | 11 |

## Esforço de avaliação — não é custo de operação

Cartões únicos: **54** · sujeitos: 83 · sem evidência verificada: 39 · com unidade candidata: 46.

Estimativa: **279 min** (3 min/cartão +3 sem evidência — DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui).

Nenhum orçamento de revisão foi declarado para este pacote.

Isto é o que custou **medir**, e fica separado do que custaria **operar** o agente — as duas
contas respondem a perguntas diferentes e somá-las não significaria nada.

## Fechamento

| Fila | Quantidade | Efeito |
|---|---|---|
| Ativa (desta bateria) | 0 | **Fecha a bateria.** Enquanto houver um, tudo é provisório |
| Histórica (outras baterias) | 0 | Dívida declarada; não cobra desta |
| Descobertas para a próxima referência | 10 | Entram na próxima versão do gabarito |

**Bateria fechada.** Todas as alegações foram decididas; os números acima são finais sob este gabarito e este contrato de pontuação.

