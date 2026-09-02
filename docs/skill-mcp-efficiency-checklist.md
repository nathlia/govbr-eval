# Checklist de implementação — qualidade das Skills e eficiência do MCP

Objetivo: reduzir custo, tempo e variação das avaliações sem transferir conhecimento do gov.br DS
para o protocolo e sem comprometer a comparação entre modelos ou entre os braços com/sem oráculo.

## Critérios globais de sucesso

- [ ] Manter ou aumentar precision, recall, F1 e correção das evidências.
- [ ] Reduzir a mediana de turnos do agente por execução completa.
- [ ] Reduzir tokens visíveis ao modelo, incluindo `cache_read_input_tokens`.
- [ ] Reduzir tempo de parede e custo por unidade correta encontrada.
- [ ] Preservar o mesmo protocolo, orçamento e configuração dentro de cada comparação pareada.
- [ ] Não colocar regras, tokens, nomes de violações ou localizações do gabarito nas Skills.
- [ ] Não compartilhar cache de evidências entre páginas ou estados com fingerprints diferentes.

Registrar antes de começar um baseline representativo:

- [ ] Modelo, versão, reasoning effort e cliente MCP.
- [ ] Braço experimental e versão do protocolo.
- [ ] Precision, recall, F1 e unidades corretas.
- [ ] Turnos, chamadas de ferramenta e tempo de parede.
- [ ] Input, cache creation, cache read e output tokens.
- [ ] Custo total e custo por unidade correta.
- [ ] Bytes devolvidos por cada ferramenta MCP.

## Fase 0 — Instrumentação antes da otimização

### Telemetria do MCP

- [x] Criar um `runId` propagado do harness para todas as chamadas MCP.
- [x] Registrar por chamada: ferramenta, início, duração, status e tamanho da resposta em bytes.
- [ ] Registrar quantidade de seletores, elementos, regras e findings processados.
- [x] Registrar `cacheHit`, fingerprint da página/estado e motivo de invalidação.
- [ ] Registrar paginação, truncamento e nível de detalhe solicitado.
- [x] Não incluir os logs de telemetria na resposta enviada ao modelo.
- [x] Produzir resumo por execução e ranking das ferramentas por bytes e latência acumulados.

**Aceite:** uma execução smoke gera uma tabela por ferramenta e permite identificar as três maiores
fontes de contexto e de latência.

### Contrato de custo

- [x] O contrato D-07 já exige tempo de parede e chamadas de ferramenta no resultado arquivado.
- [x] Tornar tokens de input/cache/output obrigatórios quando o cliente os fornecer.
- [ ] Adicionar `model`, `modelVersion`, `reasoningEffort`, `client` e `protocolVersion` ao resultado. (`reasoningEffort` ainda depende do cliente expor/configurar o valor.)
- [x] Adicionar `mcpResponseBytes`, total e por ferramenta.
- [x] Fazer o scorer calcular custo por unidade correta e qualidade por 100 mil tokens visíveis.

**Aceite:** execuções com configurações diferentes nunca são agrupadas silenciosamente.

## Fase 1 — Respostas MCP compactas

### Contrato comum de resposta

- [ ] Padronizar `detail: "summary" | "evidence" | "full"` nas ferramentas de leitura.
- [ ] Usar `summary` como padrão. (Concluído nos três scanners determinísticos; falta uniformizar as demais leituras.)
- [x] Definir limite de itens e limite aproximado de caracteres por resposta.
- [x] Retornar `truncated: true` e `nextCursor` quando o limite for atingido.
- [ ] Retornar contagens de itens verificados, conformes, suspeitos e omitidos.
- [ ] Evitar repetir texto da regra em cada finding; findings devem referenciar `ruleId`.
- [x] Evitar HTML completo; devolver locator estável e um trecho curto somente quando necessário.
- [ ] Evitar computed styles completos; devolver somente propriedades solicitadas ou divergentes.
- [ ] Não devolver stack traces ou dumps internos em erros destinados ao modelo.

**Aceite:** nenhuma ferramenta de leitura excede o orçamento padrão sem `detail: "full"` explícito.

### Findings por identificador

- [x] Fazer scanners retornarem findings compactos com `findingId`, `ruleId`, `selector`, severidade
      e confiança.
- [x] Criar `get_finding_details({ ids: [...] })` para recuperar evidência detalhada em lote.
- [x] Continuar páginas por `scanId` sem executar novamente o scanner ou alterar os finding IDs.
- [x] Permitir que `save_report` consuma finding IDs determinísticos sem reenvio dos objetos completos.
- [ ] Manter um dicionário único de regras por resposta; findings usam apenas referências.
- [x] Deduplicar findings equivalentes no servidor.
- [x] Informar quantos findings foram fundidos e qual chave de deduplicação foi usada.

**Aceite:** o agente consegue produzir o mesmo relatório buscando detalhes apenas dos candidatos que
precisam de julgamento semântico.

### Ferramentas existentes

- [x] `get_ds_rules` já possui índice/facetas, paginação e modos breve/completo.
- [ ] Aplicar o mesmo padrão a tokens, e-MAG, regras de página e especificações de componentes.
- [x] Adicionar arrays de IDs/nomes para buscar várias regras ou componentes em uma chamada. (IDs de regras concluídos; nomes de componentes podem ser adicionados quando houver caso de uso medido.)
- [ ] Tornar exemplos de componentes opt-in e paginados. (Opt-in concluído; paginação ainda pendente.)
- [x] Revisar `inspect_computed_styles` para aceitar seletores em lote e lista de propriedades.
- [x] Compactar resultados de `check_token_compliance`, `check_component_structure` e Axe.

## Fase 2 — Menos turnos e mais batching

### Scanner determinístico

- [x] Criar uma operação de varredura em lote, por exemplo `scan_page`.
- [x] Receber URL ou sessão, escopos e checks solicitados. (URL + escopos concluídos; sessão persistente continua opcional.)
- [x] Enumerar elementos, executar checks e deduplicar resultados no servidor.
- [x] Devolver cobertura agregada e somente os candidatos suspeitos.
- [x] Preservar evidências completas internamente para recuperação por `findingId`.
- [x] Separar claramente resultado determinístico de julgamento feito pelo modelo.

**Aceite:** uma varredura estática básica exige uma chamada de descoberta e, no máximo, uma chamada
de detalhes para os candidatos encontrados.

### Estado e sessão do navegador

- [ ] Introduzir `sessionId` ou `stateId` para não reabrir/recarregar a página sem necessidade. (`scanId` identifica o ledger, mas a página ainda é recarregada para verificar o fingerprint.)
- [x] Calcular fingerprint com URL, DOM relevante, viewport e estado de interação.
- [x] Reutilizar scans somente quando o fingerprint for idêntico.
- [x] Após interação, devolver um diff do estado anterior em vez de um snapshot completo.
- [x] Invalidar cache quando DOM, foco, viewport, rota ou estado acessível relevante mudar.
- [x] Isolar sessões por execução para impedir vazamento entre modelos ou braços.

### Orçamento operacional

- [x] Definir uma varredura compacta por estado de página.
- [x] Proibir repetição da mesma consulta quando o estado não mudou.
- [ ] Buscar regras detalhadas apenas quando a versão breve não resolve aplicabilidade.
- [x] Agrupar seletores, regras e finding IDs em chamadas em lote.
- [ ] Definir limite de investigações detalhadas antes de exigir justificativa do agente.
- [ ] Encerrar quando todos os candidatos estiverem aceitos, rejeitados ou marcados como incertos.

## Fase 3 — Refatoração das Skills

### Estrutura

- [ ] Definir uma única fonte canônica para o protocolo comum.
- [ ] Transformar `evaluate-all` em uma especialização fina do protocolo, não uma duplicação.
- [ ] Remover histórico de decisões e justificativas repetidas das instruções carregadas pelo agente.
- [ ] Manter na Skill apenas objetivo, restrições, algoritmo, orçamento, saída e condições de parada.
- [ ] Mover material explicativo não operacional para documentação humana.
- [ ] Remover exemplos longos de JSON; manter um schema compacto e válido.
- [ ] Colocar metadados dinâmicos da execução depois do prefixo estável.

Metas iniciais, a validar pelos testes:

- [ ] `evaluate-screen/SKILL.md` com aproximadamente 600–800 palavras.
- [ ] `evaluate-all/SKILL.md` com aproximadamente 250–400 palavras além do protocolo compartilhado.
- [ ] Cada instrução normativa aparece uma única vez.

### Fluxo decisório sugerido

- [ ] Descobrir estados e regiões interativas.
- [x] Executar uma varredura compacta por estado.
- [x] Investigar apenas findings candidatos.
- [ ] Consultar detalhes da regra somente quando houver dúvida de aplicabilidade.
- [x] Manter um ledger de evidências e nunca buscar novamente evidência já válida.
- [ ] Produzir o relatório diretamente do ledger.
- [ ] Marcar incerteza explicitamente em vez de abrir loops indefinidos de inspeção.

### Testes das Skills

- [ ] Criar casos mínimos para ativação correta da Skill.
- [ ] Testar que a Skill não ativa em tarefas fora do escopo.
- [ ] Testar aderência ao schema de saída.
- [ ] Testar respeito aos limites de chamadas e às condições de parada.
- [ ] Testar que ausência do oráculo não leva à invenção de IDs de regra.
- [ ] Testar interação, foco, composição, regra condicional e estado alterado.
- [ ] Adicionar exemplos negativos somente para falhas observadas e recorrentes.

**Aceite:** a Skill reduz contexto e turnos sem queda estatisticamente relevante de recall ou de
correção das evidências.

## Fase 4 — Superfície e roteamento das ferramentas

- [ ] Inventariar sobreposição entre todas as ferramentas registradas no servidor.
- [ ] Reduzir descrições para uma ou duas frases: o que retorna, quando usar e quando não usar.
- [ ] Remover instruções de workflow das descrições quando já estiverem na Skill.
- [ ] Considerar uma superfície mínima: busca de regras, busca detalhada, scan, detalhes de findings,
      verificação e salvamento.
- [ ] Usar carregamento dinâmico/tool search se o cliente suportar.
- [ ] Caso contrário, criar perfis explícitos do MCP ou limitar ferramentas permitidas no harness.
- [ ] Garantir que ferramentas removidas tenham migração ou alias temporário quando necessário.

**Aceite:** o modelo recebe somente ferramentas relevantes e os testes de contrato cobrem todos os
schemas expostos.

## Fase 5 — Cache e estabilidade de contexto

- [ ] Manter instruções, schemas e descrições estáveis e byte-identical entre execuções comparáveis.
- [ ] Colocar URL, run ID, seed, timestamp e braço experimental no final do prompt dinâmico.
- [ ] Remover timestamps e changelogs das Skills carregadas em runtime.
- [ ] Cachear consultas da base de conhecimento por versão da KB e argumentos normalizados.
- [ ] Cachear evidência somente por fingerprint completo da página/estado.
- [ ] Medir cache hit rate e ganho real; não considerar cache como substituto para respostas menores.
- [ ] Invalidar o cache da KB quando versão, regras ou schemas mudarem.

## Fase 6 — Validação experimental

### Execução pareada

- [ ] Congelar corpus, validator, eval, Skills e configurações antes da bateria formal.
- [ ] Executar primeiro um smoke para verificar contratos e custos.
- [ ] Rodar baseline e versão otimizada com mesmo modelo, esforço, seed quando disponível e orçamento.
- [ ] Fazer 3–5 execuções somente depois do congelamento do corpus, conforme D-07.
- [ ] Separar resultados por modelo, protocolo, cliente, braço, cobertura e versão do MCP.
- [ ] Reportar média, desvio-padrão e resultados individuais.

### Portões de qualidade

- [ ] Recall não cai além do limite definido antes do experimento.
- [ ] Evidências continuam apontando para elemento, regra e estado corretos.
- [ ] Não aumenta a taxa de findings inventados ou não verificáveis.
- [ ] Casos condicionais, interativos e de composição continuam cobertos.
- [ ] Toda resposta truncada é detectada e tratada.
- [ ] Resultados continuam reproduzíveis a partir dos artefatos arquivados.

### Portões de eficiência

- [ ] Redução de turnos por execução.
- [ ] Redução de bytes MCP devolvidos ao modelo.
- [ ] Redução de cache-read e output tokens.
- [ ] Redução de tempo de parede.
- [ ] Redução de custo total e custo por unidade correta.
- [ ] Registrar qualquer troca entre qualidade, custo e tempo em vez de escolher somente a métrica
      mais favorável.

## Guardrails da ablação

- [ ] A Skill permanece neutra e não contém regras substantivas do gov.br DS.
- [ ] O servidor não recebe IDs dos casos, gabarito ou localização conhecida das violações.
- [ ] Os braços comparáveis têm o mesmo protocolo e orçamento.
- [ ] Diferenças intencionais de ferramentas são declaradas como parte do tratamento experimental.
- [ ] Cache não atravessa páginas, estados, braços ou execuções quando puder revelar evidência.
- [ ] Truncamento, timeout e falha de ferramenta permanecem visíveis no resultado.
- [ ] Uma mudança por vez é preferida para permitir atribuir causa ao ganho ou regressão.

## Sequência recomendada de entregas

### PR 1 — Medição

- [x] Telemetria por ferramenta.
- [x] Campos de custo obrigatórios quando disponíveis.
- [x] Relatório de bytes/latência por ferramenta.
- [ ] Baseline arquivado.

### PR 2 — Compactação

- [x] Contrato `summary | evidence | full` nos scanners determinísticos.
- [x] Limites, paginação e truncamento explícito.
- [x] Findings compactos e busca detalhada por IDs.

### PR 3 — Batching

- [x] Arrays de seletores, regras e IDs.
- [x] Computed styles por propriedades solicitadas.
- [x] Deduplicação de findings.

### PR 4 — Scanner e sessão

- [x] `scan_page` determinístico.
- [x] Ledger de evidências.
- [x] Fingerprint, cache seguro e diffs de estado.

### PR 5 — Skills e ferramentas

- [ ] Protocolo canônico e Skills enxutas.
- [ ] Descrições curtas e superfície reduzida.
- [ ] Testes de ativação, aderência e orçamento.

### PR 6 — Bateria comparativa

- [ ] Congelamento das versões.
- [ ] Execuções pareadas.
- [ ] Análise de qualidade, custo, tokens, turnos e tempo.
- [ ] Decisão documentada sobre quais otimizações permanecem.

## Definição de pronto

A otimização só está pronta quando possui teste de contrato, telemetria, resultado pareado arquivado,
efeito sobre qualidade e custo documentado e nenhuma quebra dos guardrails da ablação.
