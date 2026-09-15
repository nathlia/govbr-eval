---
name: evaluate-screen
description: Avalia conformidade e acessibilidade de uma ou mais telas em execução sem ler o código do projeto. Use quando a invocação fornecer URLs e, opcionalmente, escopo e destino de salvamento.
---

# Skill: evaluate-screen

Avalie uma ou mais telas em execução sem conhecimento prévio do projeto.

Antes de agir, leia `../_shared/evaluation-protocol.md` e siga-o integralmente. A invocação fornece
as URLs, o escopo e, quando houver, a origem e o caminho de salvamento. Se não restringir o escopo,
avalie a tela inteira.

## Resultado

Produza um achado por defeito corrigível de forma independente: se corrigir uma parte não corrige a
outra, são dois achados. O mesmo defeito não se repete sob outra regra.

```json
{"selector":"#alvo","relatedSelectors":["#participante"],"rule":"wcag:4.1.2","observed":"constatação","expected":"condição","state":{"viewport":{"width":0,"height":0},"steps":["interação"]},"evidence":["referência"]}
```

O seletor será executado com `document.querySelectorAll`: ele precisa resolver na página e alcançar
somente os elementos afirmados. Um seletor que alcança vários elementos representa a mesma afirmação
para cada um. Confira todos antes de salvar. Para um defeito que depende de uma relação entre
elementos, mantenha em `selector` o sujeito principal da afirmação e liste somente os demais
participantes efetivamente inspecionados em `relatedSelectors`. Não use um ancestral largo como
substituto para o elemento observado.

`observed` é o valor, texto, atributo ou comportamento constatado; `expected`, a condição que deveria
valer. `state` traz a largura e a altura reais da janela, em pixels, e as interações desde o
carregamento, em ordem. `evidence` lista caminhos ou identificadores devolvidos pelas ferramentas que
sustentam a observação de cada elemento.

O relatório tem este contrato compacto:

```json
{"timestamp":"ISO","model":"modelo","appUrl":"URL","scope":["escopo observado"],"notes":"interações e limitações","findings":[]}
```

Use o id exato de uma regra ou restrição retornada pelo oráculo quando disponível. Uma regra ampla
não justifica uma exigência estrutural mais específica: não empreste o id de outra restrição. Fora
disso, use `emag:<seção>`, `wcag:<critério>` ou `ds:<regra>` apenas quando conseguir justificar a
atribuição; senão, `"rule": null`. Não fabrique um id plausível.

Para salvar, finalize os achados antes de sair da aplicação. Navegue para a origem indicada na
invocação e faça `POST` no caminho indicado, com `Content-Type: application/json` e o relatório como
corpo. Depois imprima uma linha por achado com seletor, regra e resumo. Se não houver achados, diga
explicitamente que o escopo inspecionado ficou limpo e ainda registre interações e limitações.
