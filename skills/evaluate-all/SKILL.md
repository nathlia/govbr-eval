---
name: evaluate-all
description: Avalia a suíte TC completa do corpus govbr local, incluindo abas, estados interativos, fragmentos orgânicos e rotas estáticas. Use somente para esse corpus experimental.
---

# Skill: evaluate-all

Especialização do protocolo geral para a suíte `TC-*` do corpus em `http://localhost:3000`.

Antes de agir, leia `../_shared/evaluation-protocol.md` e siga-o integralmente. Uma restrição de aba
na invocação substitui o percurso completo abaixo, mas não muda os critérios de julgamento.

## Percurso do corpus

1. Inspecione a tela inicial e cada aba disponível: Formulário, Navegação, Tabelas, Listas,
   Interativos e Orgânico. Faça snapshot após cada mudança de estado.
2. Na aba Interativos, opere controles com mouse e teclado; snapshot isolado não basta.
3. Em Orgânico, monte e avalie separadamente cada um dos seis fragmentos selecionáveis. A origem do
   fragmento não determina o veredito.
4. Navegue também às rotas `/static/atualizacao.html`, `/static/confirmacao.html` e
   `/static/protocolo.html`. Inspecione o HTML entregue, além da árvore renderizada.
5. Faça a passada final entre elementos antes de fechar os casos.

## Resultado

Cada caso recebe:

```json
{"detected":true,"violations_found":[{"rule":"wcag:4.1.2","description":"observação e justificativa"}],"notes":"evidência breve"}
```

`detected` é verdadeiro somente quando `violations_found` contém ao menos uma regra distinta. Casos
limpos usam lista vazia. Use ids exatos do oráculo quando disponíveis; fora dele, não invente ids.

O documento final é:

```json
{"timestamp":"ISO","model":"modelo","appUrl":"http://localhost:3000","verdicts":{"TC-B-01":{"detected":false,"violations_found":[],"notes":"evidência breve"}}}
```

Feche todos os vereditos antes de sair da aplicação. Então navegue para `http://localhost:4000` e
faça `POST /api/save-agent-results` com `Content-Type: application/json`. Imprima uma linha por caso
com id, detectado/limpo e resumo. O runner acrescentará configuração e métricas de custo ao arquivo
arquivado.
