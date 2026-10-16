# NAT-76 — tabelas dos comparadores (controles de desenvolvimento)

**Como ler.** Achado de lint ≠ diferença visual ≠ violação normativa. Uma diferença de pixels não nomeia norma: diz só que a página mudou em relação ao gêmeo conforme aprovado. Pixels e linhas não são N experimental.

A tabela **principal** de cada comparador conta **gêmeos (páginas)**. A tabela **por célula** é descritiva: as células não são independentes — duas células podem ter o mesmo sujeito (o mesmo sinal vira TP numa e FP na outra), gêmeos com a mesma diferença contam duas vezes (F4-05-D e F4-05-X: 417 501 px idênticos), e o sujeito `documento` é a página inteira (qualquer diferença o atinge). Atribuição do lint é um-para-muitos: o seletor de uma regra credita todo elemento que ele casa (nenhum caso nesta execução).

Negativos **não são comparáveis entre L e V**: L avalia todos os gêmeos conformes, inclusive os `-C`; V não avalia os `-C` (são a referência) — então a coluna de negativos de V tem menos células e não mede a mesma especificidade.

## L — Stylelint normativo (N1–N3; higiene não conta)

### Principal: por gêmeo (sinal = ≥ 1 achado normativo; no sujeito = achado atribuído e com norma cruzada)

| Família | Defeituosos avaliados | com achado | com achado no sujeito do defeito | com achado também em sujeito conforme | Conformes avaliados (inclui -C) | com achado | Outros papéis avaliados | com achado | Referências | Fora de alcance |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 5 | 0 | 0 | 0 | 7 | 0 | 3 | 0 | 0 | 2 |
| F2 | 7 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 1 |
| F3 | 6 | 0 | 0 | 0 | 7 | 0 | 3 | 0 | 0 | 2 |
| F4 | 4 | 0 | 0 | 0 | 5 | 0 | 2 | 0 | 0 | 0 |
| F5 | 3 | 0 | 0 | 0 | 4 | 0 | 1 | 0 | 0 | 0 |
| F6 | 2 | 1 | 1 | 0 | 4 | 1 | 0 | 0 | 0 | 0 |
| F7 | 1 | 0 | 0 | 0 | 2 | 0 | 1 | 0 | 0 | 0 |
| F8 | 1 | 1 | 1 | 0 | 2 | 1 | 2 | 0 | 0 | 0 |
| T | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| total | 31 | 4 | 4 | 0 | 38 | 2 | 12 | 0 | 0 | 5 |

### Descritiva: por célula

| Família | Positivos | TP | FN | (FN fora de alcance, medido) | (FN sem mudança declarada) | (FN sujeito não resolvido) | (FN contexto ARIA) | Negativos avaliados (inclui -C) | FP | TN | (TN sujeito não resolvido) | À parte | Referência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 6 | 0 | 6 | 6 | 0 | 0 | 0 | 14 | 0 | 14 | 0 | 3 | 0 |
| F2 | 6 | 0 | 6 | 6 | 0 | 0 | 0 | 14 | 0 | 14 | 0 | 3 | 0 |
| F3 | 7 | 0 | 7 | 7 | 0 | 0 | 0 | 12 | 0 | 12 | 2 | 7 | 0 |
| F4 | 5 | 0 | 5 | 5 | 0 | 0 | 0 | 8 | 0 | 8 | 2 | 5 | 0 |
| F5 | 3 | 0 | 3 | 3 | 0 | 0 | 0 | 8 | 0 | 8 | 0 | 1 | 0 |
| F6 | 2 | 1 | 1 | 1 | 0 | 0 | 0 | 4 | 1 | 3 | 0 | 0 | 0 |
| F7 | 1 | 0 | 1 | 1 | 0 | 0 | 0 | 5 | 0 | 5 | 0 | 1 | 0 |
| F8 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 1 | 0 | 2 | 0 |
| T | 4 | 2 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| total | 35 | 4 | 31 | 29 | 2 | 0 | 0 | 67 | 2 | 65 | 4 | 22 | 0 |

## V — regressão visual contra o gêmeo -C

### Principal: por gêmeo (sinal = ≥ 1 pixel diferente; no sujeito = diferença dentro da caixa do sujeito, regra vigente D1)

| Família | Defeituosos avaliados | com diferença | com diferença no sujeito do defeito | com diferença também em sujeito conforme | Conformes avaliados (sem os -C) | com diferença | Outros papéis avaliados | com diferença | Referências | Fora de alcance |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 5 | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 6 | 4 |
| F2 | 7 | 7 | 6 | 2 | 1 | 1 | 0 | 0 | 6 | 1 |
| F3 | 6 | 6 | 3 | 0 | 0 | 0 | 3 | 3 | 7 | 2 |
| F4 | 4 | 4 | 2 | 0 | 1 | 1 | 2 | 2 | 4 | 0 |
| F5 | 3 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 3 | 0 |
| F6 | 2 | 1 | 1 | 0 | 2 | 2 | 0 | 0 | 2 | 0 |
| F7 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| F8 | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 2 | 0 |
| T | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| total | 29 | 21 | 15 | 3 | 7 | 7 | 9 | 7 | 32 | 9 |

### Descritiva: por célula (regra vigente, D1: caixa gêmeo ∪ referência)

| Família | Positivos | TP | FN | (FN fora de alcance, medido) | (FN sem mudança declarada) | (FN sujeito não resolvido) | (FN contexto ARIA) | Negativos avaliados (sem os -C) | FP | TN | (TN sujeito não resolvido) | À parte | Referência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 6 | 1 | 5 | 0 | 0 | 0 | 4 | 4 | 2 | 2 | 0 | 5 | 8 |
| F2 | 6 | 6 | 0 | 0 | 0 | 0 | 0 | 5 | 3 | 2 | 0 | 2 | 10 |
| F3 | 7 | 3 | 4 | 0 | 0 | 2 | 1 | 3 | 1 | 2 | 1 | 5 | 11 |
| F4 | 5 | 3 | 2 | 0 | 0 | 2 | 1 | 3 | 3 | 0 | 0 | 4 | 6 |
| F5 | 3 | 1 | 2 | 0 | 0 | 0 | 1 | 5 | 3 | 2 | 0 | 1 | 3 |
| F6 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 2 |
| F7 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 0 | 1 | 3 |
| F8 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 2 |
| T | 4 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| total | 35 | 16 | 19 | 4 | 0 | 4 | 7 | 25 | 15 | 10 | 1 | 19 | 45 |

### Auditoria do D1: as mesmas tabelas com a caixa congelada no §4 (só a do gêmeo)

| Família | Defeituosos avaliados | com diferença | com diferença no sujeito do defeito | com diferença também em sujeito conforme | Conformes avaliados (sem os -C) | com diferença | Outros papéis avaliados | com diferença | Referências | Fora de alcance |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 5 | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 6 | 4 |
| F2 | 7 | 7 | 5 | 2 | 1 | 1 | 0 | 0 | 6 | 1 |
| F3 | 6 | 6 | 3 | 0 | 0 | 0 | 3 | 3 | 7 | 2 |
| F4 | 4 | 4 | 2 | 0 | 1 | 1 | 2 | 2 | 4 | 0 |
| F5 | 3 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 3 | 0 |
| F6 | 2 | 1 | 1 | 0 | 2 | 2 | 0 | 0 | 2 | 0 |
| F7 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 0 |
| F8 | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 1 | 2 | 0 |
| T | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| total | 29 | 21 | 14 | 3 | 7 | 7 | 9 | 7 | 32 | 9 |

| Família | Positivos | TP | FN | (FN fora de alcance, medido) | (FN sem mudança declarada) | (FN sujeito não resolvido) | (FN contexto ARIA) | Negativos avaliados (sem os -C) | FP | TN | (TN sujeito não resolvido) | À parte | Referência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | 6 | 1 | 5 | 0 | 0 | 0 | 4 | 4 | 2 | 2 | 0 | 5 | 8 |
| F2 | 6 | 5 | 1 | 0 | 0 | 0 | 0 | 5 | 3 | 2 | 0 | 2 | 10 |
| F3 | 7 | 3 | 4 | 0 | 0 | 2 | 1 | 3 | 1 | 2 | 1 | 5 | 11 |
| F4 | 5 | 3 | 2 | 0 | 0 | 2 | 1 | 3 | 3 | 0 | 0 | 4 | 6 |
| F5 | 3 | 1 | 2 | 0 | 0 | 0 | 1 | 5 | 3 | 2 | 0 | 1 | 3 |
| F6 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 2 |
| F7 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 0 | 1 | 3 |
| F8 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 2 |
| T | 4 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| total | 35 | 15 | 20 | 4 | 0 | 4 | 7 | 25 | 15 | 10 | 1 | 19 | 45 |

Efeito líquido do D1 (vigente − sem D1): TP +1, FP +0, FN -1, TN +0. Células que mudaram: F2-08-D `.br-breadcrumb` FN→TP.

## Telas (lint; regressão visual = lacuna, sem gêmeo conforme)

### solicitacao

Achados normativos de origem página: 5 (por biblioteca embutida, heurística de seletor: aplicação/outros 5) · de origem DS (não cobrados): 139, dos quais 0 com valor normalizado diferente do DS e 25 sem valor (N3, bloco) · higiene página/DS: 18/2555

Fora de alcance: estilo inline do React (style={{}}) vai no JS, não numa folha; regressão visual: não há build conforme anterior à injeção (plano §7)

| Spec | Estado | Achados atribuídos | Creditados | Regras |
|---|---|---|---|---|
| A-01 | dialogo-aberto | 1 | 0 |  |
| A-02 | sempre | 0 | 0 |  |
| A-03 | dialogo-aberto | 1 | 1 | N1 |
| A-04 | sempre | 0 | 0 |  |
| A-05 | sempre | 0 | 0 |  |
| A-06 | apos-envio-vazio | 0 | 0 |  |
| A-07 | sempre | 2 | 0 |  |
| A-08 | apos-envio-vazio | 0 | 0 |  |
| A-09 | sempre | 0 | 0 |  |
| A-10 | sempre | 0 | 0 |  |
| A-11 | apos-envio-vazio | 0 | 0 |  |
| A-12 | sempre | 2 | 0 |  |
| P-01 | sempre | 1 | 0 |  |
| P-02 | sempre | 0 | 0 |  |

### vistorias

Achados normativos de origem página: 102 (por biblioteca embutida, heurística de seletor: Summernote 96, SweetAlert2 3, aplicação/outros 3) · de origem DS (não cobrados): 90, dos quais 0 com valor normalizado diferente do DS e 23 sem valor (N3, bloco) · higiene página/DS: 108/2555

Fora de alcance: estilos de componente do Angular vão como texto dentro dos chunks JS: não são folha servida (sem fonte: sources vazio); regressão visual: aplicação real sem versão conforme (plano §7)

| Spec | Estado | Achados atribuídos | Creditados | Regras |
|---|---|---|---|---|
| B-01 | sempre | 0 | 0 |  |
| B-02 | inicial | 0 | 0 |  |
| B-03 | inicial | 0 | 0 |  |
| B-04 | inicial | 0 | 0 |  |
| B-05 | inicial | 0 | 0 |  |
| B-06 | inicial | 0 | 0 |  |
| B-07 | inicial | 0 | 0 |  |
| B-08 | inicial | 0 | 0 |  |
| B-09 | inicial | 0 | 0 |  |
| B-10 | inicial | 0 | 0 |  |
| B-11 | inicial | 0 | 0 |  |
| B-12 | inicial | 0 | 0 |  |
| B-13 | inicial | 0 | 0 |  |
| B-14 | sempre | 0 | 0 |  |
| B-15 | detalhe-menu | 0 | 0 |  |
| B-16 | detalhe-menu | 0 | 0 |  |
| B-17 | detalhe-menu | 0 | 0 |  |
| B-18 | detalhe-menu | 0 | 0 |  |
| B-19 | detalhe-menu | 0 | 0 |  |
| B-20 | detalhe-menu | 0 | 0 |  |
| B-21 | detalhe | 0 | 0 |  |
| B-22 | detalhe | 0 | 0 |  |
| B-23 | detalhe | 0 | 0 |  |
| B-24 | modal | 0 | 0 |  |
| B-25 | sempre | 0 | 0 |  |
| B-26 | inicial | 0 | 0 |  |
| B-27 | modal | 0 | 0 |  |
| B-28 | inicial | 0 | 0 |  |
| B-29 | inicial | 0 | 0 |  |

## Células TP / FP / FN e TN sem sujeito resolvido, uma a uma

### L

| Gêmeo | Papel | Sujeito | Normas | Esperado | Resultado | Observação |
|---|---|---|---|---|---|---|
| F1-01-D | defeituoso | `input#cartao` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | a mudança controlada não toca CSS |
| F1-01-D | defeituoso | `input#cartao` | wcag:1.4.1 | confirmed | **FN** | a mudança controlada não toca CSS |
| F1-03-D | defeituoso | `input#cartao` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | a mudança controlada não toca CSS |
| F1-08-D | defeituoso | `input#telefone` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | a mudança controlada não toca CSS |
| F1-11-D | defeituoso | `input#cartao` | wcag:3.3.1, emag:6.6, wcag:1.4.1 | confirmed | **FN** | a mudança controlada não toca CSS |
| F1-12-D | defeituoso | `div#resumo-erros` | wcag:4.1.3 | confirmed | **FN** | a mudança controlada não toca CSS |
| F2-01-D | defeituoso | `.br-message#aviso-renovacao` | ds:message-d0c7ed3f91af | confirmed | **FN** | a mudança controlada não toca CSS |
| F2-03-D | defeituoso | `.br-header` | ds:header-e58979706103 | confirmed | **FN** | a mudança controlada não toca CSS |
| F2-07-D | defeituoso | `.br-message#m3` | ds:message-d0c7ed3f91af | confirmed | **FN** | a mudança controlada não toca CSS |
| F2-08-D | defeituoso | `.br-breadcrumb` | ds:breadcrumb-478cffdbb111, ds:breadcrumb-660169599b49 | confirmed | **FN** | a mudança controlada não toca CSS |
| F2-08-L | defeituoso | `.br-breadcrumb li:last-child` | ds:breadcrumb-53db61fa81f9 | confirmed | **FN** | a mudança controlada não toca CSS |
| F2-09-D | defeituoso | `.br-modal#regras` | ds:modal-672bf38f39fb | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-01-D | defeituoso | `modal#regras` | ds:modal-f36c91d7073c | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-02-D | defeituoso | `modal#renovar` | ds:modal-6f984d79466a | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-02-Q | depende-autora | `modal#renovar-data` | ds:modal-6f984d79466a | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-04-D | defeituoso | `modal#horario` | ds:modal-e0ce4b474163 | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-05-D | defeituoso | `modal#renovar` | ds:modal-744f67e17bec | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-07-D | defeituoso | `menu#principal@abrir` | ds:menu-a3be6788bdea | confirmed | **FN** | a mudança controlada não toca CSS |
| F3-07-C | conforme | `menu#principal@abrir` | ds:menu-a3be6788bdea | conforme | **TN** | sujeito não resolvido |
| F3-07-N | nao-aplicavel | `menu#principal@abrir` | ds:menu-a3be6788bdea | nao-aplicavel | **TN** | sujeito não resolvido |
| F3-10-D | defeituoso | `modal#multas` | ds:modal-f36c91d7073c | confirmed | **FN** | a mudança controlada não toca CSS |
| F4-02-D | defeituoso | `a.skip` | emag:1.5, ds:skiplink-b0641993618f | confirmed | **FN** | a mudança controlada não toca CSS |
| F4-02-C | conforme | `a.skip` | emag:1.5, ds:skiplink-b0641993618f | conforme | **TN** | sujeito não resolvido |
| F4-03-D | defeituoso | `a.skip` | emag:1.5 | confirmed | **FN** | a mudança controlada não toca CSS |
| F4-03-C | conforme | `a.skip` | emag:1.5 | conforme | **TN** | sujeito não resolvido |
| F4-04-D | defeituoso | `h3 Seus empréstimos` | emag:1.3 | confirmed | **FN** | a mudança controlada não toca CSS |
| F4-05-D | defeituoso | `header#topo` | emag:1.8 | confirmed | **FN** | a mudança controlada não toca CSS |
| F4-05-D | defeituoso | `footer#rodape` | emag:1.8 | confirmed | **FN** | a mudança controlada não toca CSS |
| F5-02-D | defeituoso | `button#renovar` | wcag:2.5.3 | confirmed | **FN** | a mudança controlada não toca CSS |
| F5-03-D | defeituoso | `input#busca-titulo` | emag:6.2 | confirmed | **FN** | a mudança controlada não toca CSS |
| F5-05-D | defeituoso | `a#logo` | wcag:1.1.1, wcag:2.4.4, wcag:4.1.2, emag:3.6 | confirmed | **FN** | a mudança controlada não toca CSS |
| F6-01-D | defeituoso | `button#renovar` | wcag:2.4.7, emag:4.4 | confirmed | **TP** |  |
| F6-01-X | alternativa | `button#renovar` | wcag:2.4.7, emag:4.4 | conforme | **FP** |  |
| F6-02-D | defeituoso | `button#filtros` | wcag:4.1.2 | confirmed | **FN** | a mudança controlada não toca CSS |
| F7-03-D | defeituoso | `input#telefone` | wcag:2.5.3, wcag:1.3.1, emag:6.2 | confirmed | **FN** | a mudança controlada não toca CSS |
| F8-03-D | defeituoso | `p.aviso-prazo` | ds:tipografia-21fb08664799 | confirmed | **TP** |  |
| F8-03-X | excecao | `p.aviso-prazo` | ds:tipografia-21fb08664799 | conforme | **FP** |  |
| T-01-P | defeituoso | `button#renovar` | wcag:2.4.7 | confirmed | **TP** |  |
| T-01-P | defeituoso | `button#excluir` | wcag:4.1.2 | confirmed | **FN** | sem mudança declarada no caso |
| T-01-S | defeituoso | `button#renovar` | wcag:2.4.7 | confirmed | **TP** |  |
| T-01-S | defeituoso | `button#excluir` | wcag:4.1.2 | confirmed | **FN** | sem mudança declarada no caso |

### V (regra vigente)

| Gêmeo | Papel | Sujeito | Normas | Esperado | Resultado | Observação |
|---|---|---|---|---|---|---|
| F1-01-D | defeituoso | `input#cartao` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | contexto-aria |
| F1-01-D | defeituoso | `input#cartao` | wcag:1.4.1 | confirmed | **FN** | contexto-aria |
| F1-03-D | defeituoso | `input#cartao` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | contexto-aria |
| F1-08-D | defeituoso | `input#telefone` | wcag:3.3.1, emag:6.6 | confirmed | **FN** | contexto-aria |
| F1-10-N | nao-aplicavel | `input#cartao` | wcag:3.3.1, emag:6.6 | nao-aplicavel | **FP** |  |
| F1-11-D | defeituoso | `input#cartao` | wcag:3.3.1, emag:6.6, wcag:1.4.1 | confirmed | **TP** |  |
| F1-12-D | defeituoso | `div#resumo-erros` | wcag:4.1.3 | confirmed | **FN** |  |
| F1-12-X | excecao | `div#resumo-erros` | wcag:4.1.3 | nao-aplicavel | **FP** |  |
| F2-01-D | defeituoso | `.br-message#aviso-renovacao` | ds:message-d0c7ed3f91af | confirmed | **TP** |  |
| F2-01-D | defeituoso | `.br-message#aviso-renovacao` | ds:message-0e441e3af975 | nao-aplicavel | **FP** |  |
| F2-03-D | defeituoso | `.br-header` | ds:header-e58979706103 | confirmed | **TP** |  |
| F2-03-X | alternativa | `.br-header` | ds:header-e58979706103 | conforme | **FP** |  |
| F2-07-D | defeituoso | `.br-message#m3` | ds:message-d0c7ed3f91af | confirmed | **TP** |  |
| F2-08-D | defeituoso | `.br-breadcrumb` | ds:breadcrumb-478cffdbb111, ds:breadcrumb-660169599b49 | confirmed | **TP** |  |
| F2-08-L | defeituoso | `.br-breadcrumb` | ds:breadcrumb-478cffdbb111 | conforme | **FP** |  |
| F2-08-L | defeituoso | `.br-breadcrumb li:last-child` | ds:breadcrumb-53db61fa81f9 | confirmed | **TP** |  |
| F2-09-D | defeituoso | `.br-modal#regras` | ds:modal-672bf38f39fb | confirmed | **TP** |  |
| F3-01-D | defeituoso | `modal#regras` | ds:modal-f36c91d7073c | confirmed | **FN** |  |
| F3-02-D | defeituoso | `modal#renovar` | ds:modal-6f984d79466a | confirmed | **TP** |  |
| F3-02-Q | depende-autora | `modal#renovar-data` | ds:modal-6f984d79466a | confirmed | **FN** | sujeito não resolvido |
| F3-03-U | sem-forca | `modal#excluir-lista` | ds:modal-6f984d79466a | conforme | **FP** |  |
| F3-04-D | defeituoso | `modal#horario` | ds:modal-e0ce4b474163 | confirmed | **TP** |  |
| F3-05-D | defeituoso | `modal#renovar` | ds:modal-744f67e17bec | confirmed | **TP** |  |
| F3-07-D | defeituoso | `menu#principal@abrir` | ds:menu-a3be6788bdea | confirmed | **FN** | contexto-aria; sujeito não resolvido |
| F3-07-N | nao-aplicavel | `menu#principal@abrir` | ds:menu-a3be6788bdea | nao-aplicavel | **TN** | sujeito não resolvido |
| F3-10-D | defeituoso | `modal#multas` | ds:modal-f36c91d7073c | confirmed | **FN** |  |
| F4-02-D | defeituoso | `a.skip` | emag:1.5, ds:skiplink-b0641993618f | confirmed | **FN** | contexto-aria; sujeito não resolvido |
| F4-03-D | defeituoso | `a.skip` | emag:1.5 | confirmed | **FN** | sujeito não resolvido |
| F4-04-D | defeituoso | `h3 Seus empréstimos` | emag:1.3 | confirmed | **TP** |  |
| F4-04-H | sem-fonte | `documento` | wcag:1.3.1 | conforme | **FP** | sujeito = página inteira |
| F4-05-D | defeituoso | `header#topo` | emag:1.8 | confirmed | **TP** |  |
| F4-05-D | defeituoso | `footer#rodape` | emag:1.8 | confirmed | **TP** |  |
| F4-05-X | conforme | `header#topo` | emag:1.8 | conforme | **FP** |  |
| F4-05-X | conforme | `footer#rodape` | emag:1.8 | conforme | **FP** |  |
| F5-02-D | defeituoso | `button#renovar` | wcag:2.5.3 | confirmed | **FN** | contexto-aria |
| F5-03-D | defeituoso | `input#busca-titulo` | emag:6.2 | confirmed | **TP** |  |
| F5-03-D | defeituoso | `input#busca-titulo` | wcag:4.1.2 | conforme | **FP** |  |
| F5-03-D | defeituoso | `input#busca-titulo` | ds:input-f6c8d7d71ef5 | nao-aplicavel | **FP** |  |
| F5-05-D | defeituoso | `a#logo` | wcag:1.1.1, wcag:2.4.4, wcag:4.1.2, emag:3.6 | confirmed | **FN** |  |
| F5-05-X | alternativa | `a#logo` | wcag:1.1.1, wcag:2.4.4, wcag:4.1.2, emag:3.6 | conforme | **FP** |  |
| F6-01-D | defeituoso | `button#renovar` | wcag:2.4.7, emag:4.4 | confirmed | **TP** |  |
| F6-01-X | alternativa | `button#renovar` | wcag:2.4.7, emag:4.4 | conforme | **FP** |  |
| F6-02-D | defeituoso | `button#filtros` | wcag:4.1.2 | confirmed | **FN** |  |
| F6-02-X | alternativa | `button#filtros` | wcag:4.1.2 | conforme | **FP** |  |
| F7-03-D | defeituoso | `input#telefone` | wcag:2.5.3, wcag:1.3.1, emag:6.2 | confirmed | **FN** |  |
| F8-03-D | defeituoso | `p.aviso-prazo` | ds:tipografia-21fb08664799 | confirmed | **TP** |  |
| F8-03-X | excecao | `p.aviso-prazo` | ds:tipografia-21fb08664799 | conforme | **FP** |  |
| T-01-P | defeituoso | `button#renovar` | wcag:2.4.7 | confirmed | **FN** | sem referência: o caso não tem gêmeo -C |
| T-01-P | defeituoso | `button#excluir` | wcag:4.1.2 | confirmed | **FN** | sem referência: o caso não tem gêmeo -C |
| T-01-S | defeituoso | `button#renovar` | wcag:2.4.7 | confirmed | **FN** | sem referência: o caso não tem gêmeo -C |
| T-01-S | defeituoso | `button#excluir` | wcag:4.1.2 | confirmed | **FN** | sem referência: o caso não tem gêmeo -C |
