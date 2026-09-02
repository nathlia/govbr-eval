# Perfis de ferramentas do validator

O servidor mantém superfícies causais explícitas. `full` é o padrão para desenvolvimento;
`evaluation` preserva o pacote compacto legado; `normative`, `deterministic` e `evidence` isolam
as três contribuições que o D-28 mostrou estarem confundidas. Valor desconhecido cai em `full`.

| Capacidade | `full` | `evaluation` | `normative` | `deterministic` | `evidence` |
|---|---:|---:|---:|---:|---:|
| Regras DS, tokens, e-MAG, página e componentes | sim | sim | sim | não | não |
| Scanner agregado | sim | sim | não | sim | não |
| Detalhes do ledger | sim | sim | não | sim | não |
| Verificação mista de achado heurístico | sim | sim | não | não | não |
| Estilos autorais/computados isolados | sim | não | não | não | sim |
| Lista e scanners individuais | sim | não | não | não | não |
| Persistência de relatório | sim | não | não | não | não |

Os testes de integração fixam a lista exata de cada perfil. `run-battery.ps1 -OracleProfile`
seleciona a superfície e gera a allowlist correspondente para o Codex; o perfil também entra em
`RunConfig` e na chave de agrupamento do scorer. Uma rodada `normative`, portanto, não consegue
chamar scanner nem ler recursos normativos por uma superfície lateral de `deterministic`.
