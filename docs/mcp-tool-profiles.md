# Perfis de ferramentas do validator

O servidor mantém duas superfícies explícitas. `full` é o padrão para desenvolvimento e preserva
compatibilidade; `evaluation` é usado pela bateria para reduzir schemas e decisões expostos ao
modelo. Se `GOVBR_VALIDATOR_TOOL_PROFILE` não for `evaluation`, o servidor inicia em `full`.

| Capacidade | `full` | `evaluation` | Caminho preferido na avaliação |
|---|---:|---:|---|
| Regras DS, tokens, e-MAG e página | sim | sim | consultas filtradas e em lote |
| Especificação de componente | sim | sim | `get_component_spec` |
| Scanner agregado | sim | sim | `scan_page` |
| Detalhes do ledger | sim | sim | `get_finding_details` |
| Verificação de achado heurístico | sim | sim | `verify_finding` |
| Lista de componentes | sim | não | `scan_page.coverage.componentsFound` |
| Estilos computados isolados | sim | não | evidência do `scan_page` |
| Scanners individuais de token, estrutura e axe | sim | não | checks do `scan_page` |
| Persistência de relatório do validator | sim | não | endpoint do dashboard da suíte |

Assim, a superfície formal cai de 14 para 8 ferramentas sem remover contratos públicos. Os testes
de integração fixam as listas dos dois perfis. A configuração da bateria também permite somente as
oito ferramentas do perfil `evaluation`, evitando divergência entre descoberta e autorização.
