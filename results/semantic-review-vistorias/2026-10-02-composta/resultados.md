# Resultados — bateria v02 da tela de fluxo

Pontuação `flow-semantic-1.4.0` · pacote `784185169fd2` · decisões `9aab791c4811`

Todos os números desta página saem de UMA execução do scorer sobre o pacote acima. Não há
fórmula mantida em paralelo: quem discordar do scorer discorda desta página também.

> **PROVISÓRIO.** 4 execução(ões) ainda têm alegação sem decisão (89 cartão(ões) na fila ativa). Revocação, precisão e F1 saem `null` até a revisão fechar. Nada aqui é resultado final.

## Por execução

| Execução | Braço | Estado | Detectadas | Revocação | Precisão | F1 | Citação | Novas | Falsas | Sem resolver | US$ | s | Turnos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `axe` | linha-de-base | complete | 27/102 | 26.5% | 90.0% | 40.9% | 91.8% | 19 | 3 | 0 | US$ 0.0000 | 2.3 | — |
| `validator-nao-guiada` | linha-de-base | complete | 10/102 | 9.8% | 18.2% | 12.7% | 4.9% | 6 | 45 | 0 | US$ 0.0000 | 8.8 | — |
| `agent-2026-10-02T03-39-50-sem-run1-4bbd8345.json` | sem-oraculo | complete | 27/102 | 26.5% | 100.0% | 41.9% | 93.3% | 33 | 0 | 0 | US$ 5.3702 | 639.9 | 70 |
| `agent-2026-10-02T03-39-50-sem-run2-dfa77ab4.json` | sem-oraculo | provisional | 0/102 | — | — | — | — | 0 | 0 | 65 | US$ 5.3675 | 1104.2 | 59 |
| `agent-2026-10-02T12-56-12-sem-run1-120f567c.json` | sem-oraculo | provisional | 0/102 | — | — | — | — | 0 | 0 | 79 | US$ 8.0563 | 1074.4 | 92 |
| `agent-2026-10-02T03-39-50-com-run1-3c27143f.json` | com-oraculo | provisional | 0/102 | — | — | — | — | 0 | 0 | 54 | US$ 6.8223 | 1099.4 | 84 |
| `agent-2026-10-02T03-39-50-com-run2-71b61273.json` | com-oraculo | complete | 27/102 | 26.5% | 90.0% | 40.9% | 88.2% | 38 | 3 | 0 | US$ 7.9357 | 938.4 | 86 |
| `agent-2026-10-02T12-56-12-com-run1-45f31d67.json` | com-oraculo | provisional | 0/102 | — | — | — | — | 0 | 0 | 62 | US$ 5.1566 | 889.4 | 54 |

## Por braço

| Braço | n | Revocação média | DP | Precisão média | F1 médio | Detectadas média | US$ total | s médio | Turnos médio |
|---|---|---|---|---|---|---|---|---|---|
| com-oraculo | 3 | 26.5% | — | 90.0% | 40.9% | 9.0 | US$ 19.9146 | 975.7 | 74.7 |
| sem-oraculo | 3 | 26.5% | — | 100.0% | 41.9% | 9.0 | US$ 18.7939 | 939.5 | 73.7 |

O desvio-padrão é amostral e descreve a dispersão entre as execuções deste braço. **Nenhum teste
inferencial é aplicado**: três execuções por braço é o que cabe no orçamento desta pesquisa, e foi
declarado como estudo de caso antes da coleta, não como limiar de suficiência.

## Citação, separada da detecção

| Braço | Citação média | Detectadas média | Falsas revisadas | Sem resolver |
|---|---|---|---|---|
| com-oraculo | 88.2% | 9.0 | 3 | 116 |
| sem-oraculo | 93.3% | 9.0 | 0 | 144 |

Citar a norma certa não prova detecção, e detectar sem citação mecanicamente válida não é falso
positivo. **Falsas revisadas** e **sem resolver** ficam em colunas diferentes de propósito: uma é
alegação julgada errada; a outra é dúvida que ninguém decidiu ainda.

## Cobertura por família e por unidade

| Spec | Unidades | com-oraculo (máx.) | sem-oraculo (máx.) | com-oraculo (execuções que detectaram) | sem-oraculo (execuções que detectaram) |
|---|---|---|---|---|---|
| B-01 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-02 | 1 | 0 | 1 | 0/3 | 1/3 |
| B-03 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-04 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-05 | 2 | 0 | 0 | 0/3 | 0/3 |
| B-06 | 11 | 11 | 11 | 1/3 | 1/3 |
| B-07 | 10 | 0 | 0 | 0/3 | 0/3 |
| B-08 | 40 | 0 | 0 | 0/3 | 0/3 |
| B-09 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-10 | 2 | 0 | 0 | 0/3 | 0/3 |
| B-11 | 4 | 4 | 4 | 1/3 | 1/3 |
| B-12 | 10 | 10 | 10 | 1/3 | 1/3 |
| B-13 | 1 | 1 | 1 | 1/3 | 1/3 |
| B-14 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-15 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-16 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-17 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-18 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-19 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-20 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-21 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-22 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-23 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-24 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-25 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-26 | 1 | 1 | 0 | 1/3 | 0/3 |
| B-27 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-28 | 1 | 0 | 0 | 0/3 | 0/3 |
| B-29 | 2 | 0 | 0 | 0/3 | 0/3 |

Instâncias repetidas da mesma spec são **oportunidades de cobertura**, não telas independentes:
uma spec com oito instâncias pesa oito no denominador de unidades e uma na contagem de famílias.

## Contra a linha de base determinística

| Agente | Linha de base | Estado | Ambos | Só agente | Só linha de base | Nenhum |
|---|---|---|---|---|---|---|
| `agent-2026-10-02T03-39-50-sem-run1-4bbd8345.json` | linha-de-base/axe | complete | 22 | 5 | 5 | 70 |
| `agent-2026-10-02T03-39-50-sem-run1-4bbd8345.json` | linha-de-base/validator-nao-guiada | complete | 0 | 27 | 10 | 65 |
| `agent-2026-10-02T03-39-50-sem-run1-4bbd8345.json` | uniao-deterministica | complete | 22 | 5 | 15 | 60 |
| `agent-2026-10-02T03-39-50-sem-run2-dfa77ab4.json` | linha-de-base/axe | provisional | 0 | 0 | 27 | 75 |
| `agent-2026-10-02T03-39-50-sem-run2-dfa77ab4.json` | linha-de-base/validator-nao-guiada | provisional | 0 | 0 | 10 | 92 |
| `agent-2026-10-02T03-39-50-sem-run2-dfa77ab4.json` | uniao-deterministica | provisional | 0 | 0 | 37 | 65 |
| `agent-2026-10-02T12-56-12-sem-run1-120f567c.json` | linha-de-base/axe | provisional | 0 | 0 | 27 | 75 |
| `agent-2026-10-02T12-56-12-sem-run1-120f567c.json` | linha-de-base/validator-nao-guiada | provisional | 0 | 0 | 10 | 92 |
| `agent-2026-10-02T12-56-12-sem-run1-120f567c.json` | uniao-deterministica | provisional | 0 | 0 | 37 | 65 |
| `agent-2026-10-02T03-39-50-com-run1-3c27143f.json` | linha-de-base/axe | provisional | 0 | 0 | 27 | 75 |
| `agent-2026-10-02T03-39-50-com-run1-3c27143f.json` | linha-de-base/validator-nao-guiada | provisional | 0 | 0 | 10 | 92 |
| `agent-2026-10-02T03-39-50-com-run1-3c27143f.json` | uniao-deterministica | provisional | 0 | 0 | 37 | 65 |
| `agent-2026-10-02T03-39-50-com-run2-71b61273.json` | linha-de-base/axe | complete | 23 | 4 | 4 | 71 |
| `agent-2026-10-02T03-39-50-com-run2-71b61273.json` | linha-de-base/validator-nao-guiada | complete | 0 | 27 | 10 | 65 |
| `agent-2026-10-02T03-39-50-com-run2-71b61273.json` | uniao-deterministica | complete | 23 | 4 | 14 | 61 |
| `agent-2026-10-02T12-56-12-com-run1-45f31d67.json` | linha-de-base/axe | provisional | 0 | 0 | 27 | 75 |
| `agent-2026-10-02T12-56-12-com-run1-45f31d67.json` | linha-de-base/validator-nao-guiada | provisional | 0 | 0 | 10 | 92 |
| `agent-2026-10-02T12-56-12-com-run1-45f31d67.json` | uniao-deterministica | provisional | 0 | 0 | 37 | 65 |

## Esforço de avaliação — não é custo de operação

Cartões únicos: **237** · sujeitos: 497 · sem evidência verificada: 178 · com unidade candidata: 87.

Estimativa: **1245 min** (3 min/cartão +3 sem evidência — DECLARADA, não medida: nenhuma sessão de revisão foi cronometrada até aqui).

Nenhum orçamento de revisão foi declarado para este pacote.

Isto é o que custou **medir**, e fica separado do que custaria **operar** o agente — as duas
contas respondem a perguntas diferentes e somá-las não significaria nada.

## Fechamento

| Fila | Quantidade | Efeito |
|---|---|---|
| Ativa (desta bateria) | 89 | **Fecha a bateria.** Enquanto houver um, tudo é provisório |
| Histórica (outras baterias) | 0 | Dívida declarada; não cobra desta |
| Descobertas para a próxima referência | 50 | Entram na próxima versão do gabarito |

**Bateria aberta.** Há alegação sem decisão; nenhum número desta página é final.

