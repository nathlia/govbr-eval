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

Produza um achado por regra e conjunto exato de elementos:

```json
{"selector":"#alvo","rule":"wcag:4.1.2","description":"observação e justificativa"}
```

O seletor será executado com `document.querySelectorAll`: ele precisa resolver na página e alcançar
somente os elementos afirmados. Um seletor que alcança vários elementos representa a mesma afirmação
para cada um. Confira todos antes de salvar.

O relatório tem este contrato compacto:

```json
{"timestamp":"ISO","model":"modelo","appUrl":"URL","scope":["escopo observado"],"notes":"interações e limitações","findings":[]}
```

Use um id determinístico retornado pelo oráculo quando disponível. Caso contrário, use `emag:<seção>`,
`wcag:<critério>` ou `ds:<regra>` apenas quando conseguir justificar a atribuição. Não fabrique um id
plausível.

Para salvar, finalize os achados antes de sair da aplicação. Navegue para a origem indicada na
invocação e faça `POST` no caminho indicado, com `Content-Type: application/json` e o relatório como
corpo. Depois imprima uma linha por achado com seletor, regra e resumo. Se não houver achados, diga
explicitamente que o escopo inspecionado ficou limpo e ainda registre interações e limitações.
