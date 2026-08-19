# Candidatos orgânicos não adjudicados — execução de 2026-08-19

**Status: pendente de adjudicação humana.** Nada aqui entra em métrica ou na dissertação antes de
ser confirmado contra os fragmentos canônicos de `@govbr-ds/core` 3.7.0.

## O que aconteceu

Na execução de 2026-08-19 (`claude-opus-5`, 58 casos), o agente detectou **6/6** dos defeitos
orgânicos catalogados e produziu **5 achados adicionais** na ala orgânica, contados como falsos
positivos pelo scorer.

Eles não são variações do defeito catalogado. O `organic-ground-truth.json` foi derivado do
relatório de auditoria da KB (`reports/official-package-audit.json`), que procurou **duas** classes
de anomalia: `alt` ausente (4 casos) e `aria-labelledby` quebrado (2 casos). Qualquer outro defeito
presente nos mesmos fragmentos está fora do gabarito **por construção da auditoria**, não por
ausência de defeito.

Ou seja: o número de FPs aqui mede o alcance da auditoria, não o erro do agente. Precisa de
adjudicação antes de virar qualquer coisa.

## Os cinco candidatos

| # | Caso | Regra citada | Alegação |
|---|---|---|---|
| 1 | TC-O-01 | `emag:3.5` | Botão de ações do cartão com `aria-label='Ícone ilustrativo'`: o nome acessível descreve o ornamento, não a função (menu de opções). |
| 2 | TC-O-02 | `wcag:4.1.2` | `.br-card.disabled` é desabilitado **apenas visualmente** — os quatro controles internos não têm `disabled` nem `aria-disabled`, seguem focáveis e acionáveis. |
| 3 | TC-O-02 | `emag:3.5` | Dois botões com funções diferentes dividem `aria-label='Ícone ilustrativo'`; um terceiro usa `'Ícone ilustrativo 3'`; há um botão rotulado literalmente `'Button'`. |
| 4 | TC-O-03 | `emag:3.5` | `aria-label='Ícone ilustrativo'` repetido em dois botões de funções distintas, mais `'Ícone ilustrativo 3'` e um botão `'Button'`. |
| 5 | TC-O-04 | `emag:3.5` | Botão de menu do cartão com `aria-label='Ícone ilustrativo'`, que não descreve a função. |

## Por que merecem atenção

O candidato 2 é de natureza diferente dos outros quatro. `aria-label` ornamental em exemplo de
documentação é discutível — pode-se argumentar que o fragmento é ilustrativo e que os rótulos são
marcadores de posição. Já um cartão que se apresenta como desabilitado e mantém quatro controles
operáveis é um defeito de contrato de estado, do mesmo tipo que a tese injeta deliberadamente no
TC-I-01. Se confirmado, é o achado orgânico mais forte do conjunto.

Os candidatos 1, 3, 4 e 5 compartilham um mesmo mecanismo (`aria-label` que descreve o ornamento
em vez da função) em quatro fragmentos distintos. Se adjudicados como defeito, são **um padrão**,
não quatro incidentes — e o padrão é mais interessante que a soma.

## Como adjudicar

1. Abrir cada fragmento canônico em `govbr-ds-validator/data/knowledge/` (ou o tarball verificado)
   e confirmar a marcação alegada — a alegação do agente não é evidência.
2. Decidir, para cada um, entre: **defeito** (entra no gabarito orgânico) · **placeholder aceitável
   em exemplo de documentação** (registrar a decisão e o porquê) · **achado incorreto**.
3. Para os confirmados: acrescentar ao `organic-ground-truth.json` e anotar a procedência
   (fragmento, linha, hash), como já é feito para os seis catalogados.
4. Registrar o resultado da adjudicação no log de decisões — inclusive as rejeições, que também
   são dado.

## Consequência para o D-13, se confirmados

O argumento do problema do oráculo fica mais forte, não mais fraco: não só o validador encontra
defeitos no artefato de referência do qual aprendeu, como encontra **classes de defeito que a
auditoria automatizada do próprio projeto não procurou**. Isso é exatamente a diferença entre uma
verificação guiada por lista e uma verificação guiada por norma.

Contrapartida honesta a declarar junto: a auditoria da KB é minha, então o que isso mostra em
parte é o limite da minha própria auditoria inicial. As duas leituras devem constar.
