# Tela D (Processos): o que a autora decide — 8 itens

Nada aqui foi aplicado à referência (`ground-truth-processos.json` `1.0.0-candidata`). Cada item tem a
medida, a pergunta e a recomendação do assistente. **"Aceito tudo"** é resposta válida; para recusar um
item, basta citar o número. Critério da recomendação (o mesmo da B e da C): vira unidade só o que tem
medida determinística, norma `required`/`prohibited` da base de 186 regras, fato autoral (não DS, não
versão, não linguagem) e cai numa parada declarada. **Na dúvida, fica fora** (⚠). Tempo estimado:
~20–25 min.

## O piso, antes de tudo

Sem as unidades `exposto`: **10 specs** (D-01…D-10; 56 unidades), **3 famílias** (F1 D-01 · F3 D-09 ·
F4 as demais), 5 tipos de componente do DS (button, tag, table, input, select), 12 controles
conformes. O piso (adendo § A: ≥ 8 specs, ≥ 3 famílias, ≥ 3 tipos, ≥ 4 conformes) **passa**, mas a F3
depende de uma só spec, a D-09, que existe pelo precedente do D-61 — ver **E-03**. Recusar a E-03
deixa a tela com 2 famílias, abaixo do piso.

## Itens

| # | Norma | Medida | Pergunta | Recomendação |
|---|---|---|---|---|
| E-01 | e6fd5e1247de · e-MAG 2.1 (WCAG 2.1.2, "sem aprisionamento") | Depois do "Voltar", o Tab real cai no `<iframe>` vazio e daí alterna iframe → body → iframe → body sem voltar ao topo. Shift+Tab a partir do iframe sai para o "Voltar". O próprio iframe (sem nome, sem indicador de foco) já é a unidade **D-10**. | O ciclo é "aprisionamento de foco"? | **Fora** ⚠: o Shift+Tab sai, e o ciclo vem do navegador sem interface (headless): num navegador comum o Tab passaria para a barra de endereço. |
| E-02 | foundation-global-1c0146e93d2e (48 × 48) | Alvos de ícone com 40 px de altura: os botões de ícone das linhas (72×40; 9 "Ver processo" + 9 "Desassociar") e "Página anterior/seguinte" (40×40, desabilitados). 40 px é a densidade padrão do Button do DS. | Entram como unidade, como os de 32 px? | **Fora** ⚠: o D-61 decidiu os alvos autorais de **32×32**; 40 px é o tamanho padrão do próprio DS, e a regra de 48 px contra ele julgaria o DS. Os 18 botões das linhas já são unidade pela falta de rótulo (D-01). |
| E-03 | foundation-global-1c0146e93d2e (citação da D-09) | D-09 = "Buscar" e os dois "Exibir lista" da paginação, 32×32, marcação autoral — o mesmo tipo de alvo que virou B-28/B-29 no D-61. Na tela C, a recomendação **ainda pendente** (E-07 de lá) é deixar o "Exibir lista" fora, porque o core o desenha circular e o exemplo oficial do Select usa o mesmo botão. | Manter a D-09 pelo precedente do D-61? | **Manter**: o D-61 é decisão sua; a da C ainda é recomendação. Se mantiver, a E-07 da C deveria seguir o mesmo caminho. **Se recusar, a tela D fica com 2 famílias, abaixo do piso.** |
| E-04 | de1efebaf255 · e-MAG 6.4 | Sair do campo de pesquisa vazio (foco + Tab) refaz a consulta: a tabela some (0 linhas) e volta com as mesmas 9 linhas. Endereço igual, nenhuma escrita. | Recarregar a lista ao sair do campo é "mudar o contexto"? | **Fora**: mesma rota, mesmos dados, foco intacto; não é mudança de contexto. Fica registrado (e a conferência espera a lista depois de cada Tab por causa disso). |
| E-05 | accessibility-list-03813ffeeb42; cb56ad444da2; e038367bd7d6 | Seletor "Exibir" da paginação: com a lista aberta, o Tab vai para o `<body>` e nenhum item é alcançado por Tab; o campo não tem `role=combobox`/`aria-expanded`, a lista não tem `role=listbox`. É o **mesmo** componente da tela C (E-03, E-04, E-05 de lá, pendentes). | Aplicar a mesma decisão que você der na C? | **Sim, e fora** (como recomendado na C): a marcação reproduz o exemplo oficial do Select; setas são a convenção de lista de opções. |
| E-06 | component-button-4d7b5f978df1 (citação da D-01) | Dos 9 "Desassociar processo do analista responsável", 8 estão desabilitados. Também não têm rótulo visível. | Os desabilitados contam na D-01? | **Contam** ⚠: a regra é de anatomia (botão não circular precisa de rótulo visível) e eles estão visíveis. Se recusar, D-01 fica com 10 unidades em vez de 18. |
| E-07 | precedentes do D-61 (B) | Casco e itens iguais aos da B: rodapé/`contentinfo` ausente (B E-02), botão Menu sem efeito (B E-15), abreviaturas "Nº", "Téc. Adm." e "PNIP" sem expansão (B E-12), nenhuma ajuda (B E-16), aba ativa só por classe (B E-03; o `br-tab` do DS não tem `aria-selected`). | Aplicar as mesmas decisões do D-61? | **Sim**: fora / não-aplicável, como na B. |
| E-08 | foundation-global-0578aa6c2828 | Grid do core 3.4.1: 24 px entre colunas; KB 3.7.0: 40 px. | Valor que só difere entre versões fica fora? | **Fora** (método § 1.4, como a E-08 da B e da C). |

**Registrado sem escalar** (sem norma no universo de 186 regras; alegação correta vira descoberta):
o nome acessível das abas é o `id` do `br-tab-item` ("AGUARDANDO_ANALISE", "TRAMITANDO", "HISTORICO" —
este para a aba visível "Concluídos"), porque a página não passa a prop `aria-label` e o web component
usa o id como reserva (casamento rótulo-nome é WCAG 2.5.3, fora do e-MAG 3.1); a data exata de "Aberto
há" só aparece no `title` da célula (passar o mouse); o seletor "Exibir" (itens por página) mostra
ícone de lupa; os 4 rádios da lista sem `name`; o `th` da coluna de seleção sem texto nem `scope` (o
checkbox dele é a D-04); duas regiões `navigation` para uma só paginação.

**Efeito se tudo for aceito:** nada muda — 14 specs / 60 unidades, 10 specs / 56 unidades sem as
expostas, 3 famílias.
