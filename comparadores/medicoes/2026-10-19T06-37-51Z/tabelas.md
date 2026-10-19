# NAT-76 — tabelas dos comparadores (controles de desenvolvimento)

**Como ler.** Achado de lint ≠ diferença visual ≠ violação normativa. Uma diferença de pixels não nomeia norma: diz só que a página mudou em relação ao gêmeo conforme aprovado. Pixels e linhas não são N experimental.

A tabela **principal** de cada comparador conta **gêmeos (páginas)**. A tabela **por célula** é descritiva: as células não são independentes — duas células podem ter o mesmo sujeito (o mesmo sinal vira TP numa e FP na outra), gêmeos com a mesma diferença contam duas vezes (F4-05-D e F4-05-X: 417 501 px idênticos), e o sujeito `documento` é a página inteira (qualquer diferença o atinge). Atribuição do lint é um-para-muitos: o seletor de uma regra credita todo elemento que ele casa (nenhum caso nesta execução).

Negativos **não são comparáveis entre L e V**: L avalia todos os gêmeos conformes, inclusive os `-C`; V não avalia os `-C` (são a referência) — então a coluna de negativos de V tem menos células e não mede a mesma especificidade.

## L — Stylelint normativo (N1–N3; higiene não conta)

### Principal: por gêmeo (sinal = ≥ 1 achado normativo; no sujeito = achado atribuído e com norma cruzada)

| Família | Defeituosos avaliados | com achado | com achado no sujeito do defeito | com achado também em sujeito conforme | Conformes avaliados (inclui -C) | com achado | Outros papéis avaliados | com achado | Referências | Fora de alcance |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 3 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 |
| F2 | 1 | 0 | 0 | 0 | 1 | 0 | 3 | 0 | 0 | 0 |
| F3 | 1 | 0 | 0 | 0 | 2 | 0 | 4 | 0 | 0 | 0 |
| F4 | 2 | 0 | 0 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| F5 | 1 | 0 | 0 | 0 | 6 | 0 | 1 | 0 | 0 | 0 |
| F6 | 1 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| F7 | 1 | 0 | 0 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| F8 | 2 | 0 | 0 | 0 | 2 | 0 | 3 | 0 | 0 | 0 |
| total | 12 | 0 | 0 | 0 | 23 | 0 | 13 | 0 | 0 | 0 |

### Descritiva: por célula

| Família | Positivos | TP | FN | (FN fora de alcance, medido) | (FN sem mudança declarada) | (FN sujeito não resolvido) | (FN contexto ARIA) | Negativos avaliados (inclui -C) | FP | TN | (TN sujeito não resolvido) | À parte | Referência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 6 | 0 | 6 | 1 | 3 | 0 |
| F2 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 5 | 0 | 5 | 0 | 1 | 0 |
| F3 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 4 | 0 | 4 | 2 | 4 | 0 |
| F4 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 5 | 0 | 5 | 0 | 1 | 0 |
| F5 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 7 | 0 | 7 | 0 | 1 | 0 |
| F6 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 0 | 0 | 0 |
| F7 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 4 | 0 | 4 | 0 | 1 | 0 |
| F8 | 3 | 0 | 3 | 1 | 0 | 0 | 0 | 6 | 0 | 6 | 0 | 0 | 0 |
| total | 12 | 0 | 12 | 9 | 0 | 0 | 0 | 39 | 0 | 39 | 3 | 11 | 0 |

## V — regressão visual contra o gêmeo -C

### Principal: por gêmeo (sinal = ≥ 1 pixel diferente; no sujeito = diferença dentro da caixa do sujeito, regra vigente D1)

| Família | Defeituosos avaliados | com diferença | com diferença no sujeito do defeito | com diferença também em sujeito conforme | Conformes avaliados (sem os -C) | com diferença | Outros papéis avaliados | com diferença | Referências | Fora de alcance |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 3 | 3 | 1 | 0 | 2 | 2 | 0 | 0 | 4 | 0 |
| F2 | 1 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | 1 | 2 |
| F3 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 4 |
| F4 | 2 | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 2 | 0 |
| F5 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 6 |
| F6 | 1 | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 0 |
| F7 | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 1 | 0 |
| F8 | 2 | 2 | 2 | 1 | 0 | 0 | 3 | 3 | 2 | 0 |
| total | 11 | 10 | 7 | 2 | 4 | 4 | 7 | 5 | 14 | 12 |

### Descritiva: por célula (regra vigente, D1: caixa gêmeo ∪ referência)

| Família | Positivos | TP | FN | (FN fora de alcance, medido) | (FN sem mudança declarada) | (FN sujeito não resolvido) | (FN contexto ARIA) | Negativos avaliados (sem os -C) | FP | TN | (TN sujeito não resolvido) | À parte | Referência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 2 | 1 | 1 | 0 | 0 | 1 | 0 | 3 | 3 | 0 | 0 | 2 | 4 |
| F2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 4 | 1 |
| F3 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 5 | 3 |
| F4 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 1 | 3 |
| F5 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 6 | 1 |
| F6 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| F7 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | 0 | 0 | 1 | 1 |
| F8 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 4 | 4 | 0 | 0 | 0 | 2 |
| total | 12 | 8 | 4 | 1 | 0 | 2 | 0 | 15 | 14 | 1 | 0 | 19 | 16 |

### Auditoria do D1: as mesmas tabelas com a caixa congelada no §4 (só a do gêmeo)

| Família | Defeituosos avaliados | com diferença | com diferença no sujeito do defeito | com diferença também em sujeito conforme | Conformes avaliados (sem os -C) | com diferença | Outros papéis avaliados | com diferença | Referências | Fora de alcance |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 3 | 3 | 1 | 0 | 2 | 2 | 0 | 0 | 4 | 0 |
| F2 | 1 | 1 | 1 | 0 | 0 | 0 | 1 | 1 | 1 | 2 |
| F3 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 4 |
| F4 | 2 | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 2 | 0 |
| F5 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 6 |
| F6 | 1 | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 0 |
| F7 | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 1 | 0 |
| F8 | 2 | 2 | 2 | 1 | 0 | 0 | 3 | 3 | 2 | 0 |
| total | 11 | 10 | 7 | 2 | 4 | 4 | 7 | 5 | 14 | 12 |

| Família | Positivos | TP | FN | (FN fora de alcance, medido) | (FN sem mudança declarada) | (FN sujeito não resolvido) | (FN contexto ARIA) | Negativos avaliados (sem os -C) | FP | TN | (TN sujeito não resolvido) | À parte | Referência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 2 | 1 | 1 | 0 | 0 | 1 | 0 | 3 | 3 | 0 | 0 | 2 | 4 |
| F2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 4 | 1 |
| F3 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 5 | 3 |
| F4 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 1 | 3 |
| F5 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 6 | 1 |
| F6 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| F7 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | 0 | 0 | 1 | 1 |
| F8 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 4 | 4 | 0 | 0 | 0 | 2 |
| total | 12 | 8 | 4 | 1 | 0 | 2 | 0 | 15 | 14 | 1 | 0 | 19 | 16 |

Efeito líquido do D1 (vigente − sem D1): TP +0, FP +0, FN +0, TN +0. Células que mudaram: nenhuma.

## Telas (lint; regressão visual = lacuna, sem gêmeo conforme)

## Células TP / FP / FN e TN sem sujeito resolvido, uma a uma

### L

| Gêmeo | Papel | Sujeito | Normas | Esperado | Resultado | Observação |
|---|---|---|---|---|---|---|
| F1-02-B | defeituoso | `input#cartao` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | a mudança controlada não toca CSS |
| F1-04-D | defeituoso | `bib-campo::input` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | a mudança controlada não toca CSS |
| F1-04-C | conforme | `bib-campo::input` | wcag:3.3.1, emag:6.6 | conforme | **TN** | sujeito não resolvido |
| F2-04-D | defeituoso | `.br-pagination` | ds:pagination-01f1635e6054 | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-06-D | defeituoso | `.br-message#resultado@exibir` | ds:message-ad83724b777f | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-06-C | conforme | `.br-message#resultado@exibir` | ds:message-ad83724b777f | conforme | **TN** | sujeito não resolvido |
| F3-06-N | nao-aplicavel | `.br-message#resultado@exibir` | ds:message-ad83724b777f | nao-aplicavel | **TN** | sujeito não resolvido |
| F4-01-D | defeituoso | `documento` | emag:1.5 | confirmed | **FN** | a mudança controlada não toca CSS; sujeito = página inteira |
| F4-06-D | defeituoso | `documento` | wcag:2.4.2, emag:3.3 | confirmed | **FN** | a mudança controlada não toca CSS; sujeito = página inteira |
| F5-01-D | defeituoso | `button#excluir` | wcag:4.1.2, ds:button-323bef5db0fd | confirmed | **FN** | a mudança controlada não toca CSS |
| F6-03-D | defeituoso | `a#acervo-item-1` | wcag:2.4.11 | confirmed | **FN** |  |
| F7-01-D | defeituoso | `fieldset#formato` | emag:6.7 | confirmed | **FN** | a mudança controlada não toca CSS |
| F8-01-D | defeituoso | `button#renovar-icone` | wcag:2.5.8, ds:iconografia-24x24 | confirmed | **FN** |  |
| F8-01-X | excecao-diverge | `button#renovar-icone` | ds:iconografia-24x24 | confirmed | **FN** |  |
| F8-02-D | defeituoso | `button#excluir-movel` | ds:iconografia-48x48 | confirmed | **FN** | a mudança controlada não toca CSS |

### V (regra vigente)

| Gêmeo | Papel | Sujeito | Normas | Esperado | Resultado | Observação |
|---|---|---|---|---|---|---|
| F1-02-A | conforme | `input#cartao` | wcag:3.3.1, emag:6.6 | conforme | **FP** |  |
| F1-02-B | defeituoso | `input#cartao` | wcag:3.3.1, emag:6.6 | confirmed | **TP** |  |
| F1-02-E | conforme | `input#cartao` | wcag:3.3.1, emag:6.6 | conforme | **FP** |  |
| F1-02-E | conforme | `input#cartao` | ds:input-2a9e95371c51 | nao-aplicavel | **FP** |  |
| F1-04-D | defeituoso | `bib-campo::input` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | sujeito não resolvido |
| F2-04-D | defeituoso | `.br-pagination` | ds:pagination-01f1635e6054 | confirmed | **TP** |  |
| F2-04-X | variante-indeterminada | `.br-pagination` | ds:pagination-01f1635e6054 | conforme | **FP** |  |
| F3-06-D | defeituoso | `.br-message#resultado@exibir` | ds:message-ad83724b777f | confirmed | **FN** | sujeito não resolvido |
| F4-01-D | defeituoso | `documento` | emag:1.5 | confirmed | **TP** | sujeito = página inteira |
| F4-01-D | defeituoso | `documento` | wcag:2.4.1 | conforme | **FP** | sujeito = página inteira |
| F4-01-D | defeituoso | `documento` | ds:skiplink-b0641993618f | nao-aplicavel | **FP** | sujeito = página inteira |
| F4-06-D | defeituoso | `documento` | wcag:2.4.2, emag:3.3 | confirmed | **FN** | sujeito = página inteira |
| F5-01-D | defeituoso | `button#excluir` | wcag:4.1.2, ds:button-323bef5db0fd | confirmed | **FN** | sem referência: o caso não tem gêmeo -C |
| F6-03-D | defeituoso | `a#acervo-item-1` | wcag:2.4.11 | confirmed | **TP** |  |
| F6-03-X | excecao | `a#acervo-item-1` | wcag:2.4.11 | conforme | **FP** |  |
| F7-01-D | defeituoso | `fieldset#formato` | emag:6.7 | confirmed | **TP** |  |
| F7-01-X | alternativa | `div#formato` | wcag:1.3.1 | conforme | **FP** |  |
| F7-01-X | alternativa | `div#formato` | emag:6.7 | nao-aplicavel | **FP** |  |
| F7-01-U | sem-fonte | `div#formato` | emag:6.7 | nao-aplicavel | **FP** |  |
| F8-01-D | defeituoso | `button#renovar-icone` | wcag:2.5.8, ds:iconografia-24x24 | confirmed | **TP** |  |
| F8-01-X | excecao-diverge | `button#renovar-icone` | wcag:2.5.8 | conforme | **FP** |  |
| F8-01-X | excecao-diverge | `button#renovar-icone` | ds:iconografia-24x24 | confirmed | **TP** |  |
| F8-01-N | nao-aplicavel | `a#regulamento` | wcag:2.5.8, ds:iconografia-24x24 | nao-aplicavel | **FP** |  |
| F8-02-D | defeituoso | `button#excluir-movel` | ds:iconografia-48x48 | confirmed | **TP** |  |
| F8-02-D | defeituoso | `button#excluir-movel` | wcag:2.5.8 | conforme | **FP** |  |
| F8-02-N | nao-aplicavel | `button#excluir-movel` | ds:iconografia-48x48 | nao-aplicavel | **FP** |  |
