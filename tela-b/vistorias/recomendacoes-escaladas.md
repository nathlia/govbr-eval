# Tela B (Vistorias): recomendação do assistente para os 20 itens escalados

O método (`5838702` § 4, adendo `9406aed`) reserva à autora a decisão de cada item escalado antes
do congelamento. Por isso esta página só **propõe**: nada aqui foi aplicado à referência. Se a
autora aceitar tudo ("ok"), o assistente aplica o que ela aceitou, marca cada unidade nova com
`origem: "autora"` na descrição, reroda os portões e registra o congelamento. Para recusar um item,
basta citar o número.

**Critério usado.** Um item vira unidade quando atende três condições: há medida determinística,
a norma citada é `required`/`prohibited` e o fato é autoral (não é padrão do DS, nem diferença de
versão, nem linguagem). Também precisa cair num estado declarado, porque âncora fora dos estados
não é medida. Na dúvida, fica fora e ganha a marca ⚠.

| # | Recomendação | Unidades | Por quê |
|---|---|---|---|
| E-01 | **Incluir**: `title`, único, estado `sempre` | +1 | `<title>PNIP</title>` igual nas três rotas e sem o conteúdo da página. A e-MAG 3.3 pede título descritivo, e o fato é medido e autoral. |
| E-02 | Fora | 0 | Nenhuma regra `required` da KB 3.7.0 exige rodapé textualmente (o Footer só tem `example`). O item também está exposto (D-54..D-56). |
| E-03 | Fora ⚠ | 0 | A aba e a página ativas têm indicação visual além da cor (sublinhado, fundo). A falta de `aria-selected`/`aria-current` depende de os papéis ARIA estarem declarados, e isso é interpretação da regra de widget. |
| E-04 | **Incluir só o `th` da coluna de ações** | +1 | O `th` de ações não tem texto nem nome, o que é medível. O `th` da coluna de caixas contém um controle, e o defeito dele já é a B-06. |
| E-05 | Fora | 0 | A lista aberta do "Exibir"/"Página" não é estado declarado, então a âncora não seria medida. |
| E-06 | **Incluir**: único, no `br-modal`, estado `modal` | +1 | O foco sai do modal para trás do scrim (medido por Tab). É defeito autoral de um componente que o app monta, num estado declarado. |
| E-07 | **Incluir só os alvos autorais de 32×32** ⚠ | +3 | "Buscar" e os dois "Exibir lista" são montados pelo app abaixo de 48×48. Os tamanhos padrão do DS (br-button de 40 px, Menu/Home dos web components) ficam como fundo. |
| E-08 | Fora | 0 | O valor muda entre 3.4.1 e 3.7.0, e o método § 1.4 manda deixar fora. |
| E-09 | Fora | 0 | Saber se o botão é a "ação interna padrão" é interpretação de anatomia. O defeito medível do botão já é a B-09. |
| E-10 | Fora | 0 | São os mesmos elementos e a mesma família de defeito de B-11/B-19. Incluir contaria duas vezes. |
| E-11 | Fora | 0 | Estilo inline só "viola" a 1.1 por leitura ampla. É o mesmo tratamento da auditoria da privacidade. |
| E-12 | Fora | 0 | É linguagem, fora pelo § 6. |
| E-13 | Fora | 0 | Números como texto de link de paginação são o padrão do próprio componente. |
| E-14 | Fora | 0 | Um formulário só de exibição não exige fieldset por texto de norma. A instrução das datas já está coberta pela B-05. |
| E-15 | Fora ⚠ | 0 | O botão Menu sem menu é real e autoral (`has-menu`), mas a norma de anatomia não fala de botão sem efeito. O item também está exposto. |
| E-16 | Não-aplicável | 0 | É regra de produto, e uma tela isolada não responde se há ajuda em outra tela. |
| E-17 | Fora | 0 | Saber se isto é o Collapse da regra é interpretação. |
| E-18 | **Conforme** | 0 | O scrim cobre a página com justificativa (modal). Entra como controle conforme. |
| E-19 | **Manter `todos`** (D-33) ⚠ | 0 | Cada elemento carrega o defeito, e mudar a forma depois de ver os números seria moldar o resultado. Os resultados mostram a revocação por spec ao lado da por unidade, como o plano da fatia 8 já exige. |
| E-20 | **Incluir**: `todos` nos botões `user-times` da página | +N | O nome "Atribuir vistoriador" está num botão que remove o vistoriador, e o efeito é medido pelo registro de escrita do mock. N = contagem na página, medida ao aplicar. |

**Efeito se tudo for aceito:** 5 itens viram unidade (E-01, E-04, E-06, E-07, E-20), E-18 vira
controle conforme e os demais ficam registrados como fora, com o motivo. As unidades vão de 96 para
cerca de 102 + N.

## Decisão da autora (2026-10-01, D-61)

A autora aceitou a recomendação inteira ("ok, apply them"), inclusive manter B-02 e B-07/B-18.
Aplicado em `ground-truth-vistorias.json` `1.0.0`:

| Item | Resultado |
|---|---|
| E-01 | B-25 (`head > title`, `sempre`) |
| E-04 | B-26 (`th` da 9ª coluna) |
| E-06 | B-27 (mesma âncora da B-24, `modal`, condicional; medido por Tab real: 7 de 30 pontos dentro do modal) |
| E-07 | B-28 (Buscar, 1) e B-29 (Exibir lista, 2). Duas specs porque as âncoras são de componentes diferentes |
| E-18 | controle conforme C-13 (scrim de 1280×900 com o modal aberto) |
| E-20 | **Fora, ao contrário da recomendação.** A medida feita ao aplicar desmentiu a premissa. O botão `user-times` (7 na página 1) e o `user-plus` chamam a mesma `atribuirVistoriador(v.uuid)`: os dois abrem o diálogo "Atribuir Vistoriador" e gravam `POST /api/propesc/atribuir-vistoriador` ao confirmar. O nome corresponde à ação. Só o ícone (o de remover) diverge, e isso é juízo de iconografia. O critério desta página ("há medida determinística") não é atendido, e a dúvida manda deixar fora. |
| demais | fora / não-aplicável / forma mantida, com o motivo em `_meta.escaladas` |

**Efeito:** 29 specs, **102 unidades** (eram 96), 13 controles conformes. Portões:
`conferir-auditoria` 135/135, `conferir:referencia` passa, `test:isolation` 53/53, 53/53 e 54/54,
typecheck limpo. `telas.json › vistorias.reference` = `ground-truth-vistorias.json`.

**Achado lateral.** O commit `15e007e` acrescentou a espera da lista do modal à referência, mas não
a `sequencia.mjs`. Por isso `conferir-auditoria` dava 118/120 desde então (as duas conferências
"referência = sequência"). As duas foram sincronizadas nesta aplicação.

## Citações questionadas pela re-medida independente

A re-medida (§ 12 de `auditoria.md`) confirmou 24/24 specs, 96/96 unidades e 12/12 conformes. Ela
apontou duas citações que sustentam o fato só pela parte ampla da regra. As duas regras são
`required` na KB 3.7.0, então as unidades ficam dentro do método.

| Spec | Recomendação | Por quê |
|---|---|---|
| B-02 (lista sem `<h1>`) | **Manter** ⚠ | A regra `3ac0aaa53900` é `required`: "Estruture títulos de H1 a H6 hierarquicamente; prefira um único H1…". Uma hierarquia que começa em H2 fere a primeira parte. O "prefira" só fala de quantos H1. |
| B-07, B-18 (botões sem nome / fora do padrão HTML) | **Manter** ⚠ | A regra `7e6420514860` é `required` ("siga padrões Web interoperáveis"). A exigência de nome acessível vem do `wcag:4.1.2`, que já está na spec como alias. A autora pode preferir tirar essas unidades por serem sustentadas pela parte genérica da regra. |
