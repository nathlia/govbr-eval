# Diagnóstico versionado — fluxo `normative` × `none`, Opus 5, R1

**Versão deste diagnóstico:** 1.0.0  
**Data:** 2026-09-02  
**Natureza:** resultado diagnóstico do instrumento; não sustenta ranking entre braços  
**Instrumento usado na execução:** `fluxo-1.0`  
**Instrumento corretivo aberto após o diagnóstico:** `fluxo-1.1.0`  
**Validator corretivo:** `2.1.0`  
**Modelo:** `claude-opus-5` · effort `high` · cliente `claude-code`  
**Contraste:** `normative` × `none` — não é o sistema `combined`

## Evidência imutável

| Artefato | SHA-256 |
|---|---|
| `results/runs-fluxo/agent-2026-09-02T03-57-16-330Z.json` | `f44fb393097318f0aa45567870b3d2efc94467fa1ec643cb9b118acea2a3bd40` |
| `results/runs-fluxo-ablacao/agent-2026-09-02T04-02-09-639Z.json` | `e46b23e9213d05640db5ab27d0d6ccaf8ac2d2362e9420945476da7e6d7cfbb7` |
| `pipeline/logs/2026-09-02T00-50-22-bateria.json` | `c1bea931d7a4d7c7a5ff06bff4a2c8866f997120792e07a7e824331a7e993018` |

Commits no instante da execução: validator `22e1502049e00690c07f6def97df1cb8c92979b7`,
eval `4bee9e9b52a77bfc3a565865cf8cfcb56055e1b3`, log metodológico
`aad1ef6b0116df7845ad21d429e7e5189179d4bb`.

Os artefatos acima não devem ser reescritos para anexar a nova versão. A associação com
`fluxo-1.0` fica neste dossiê; execuções novas recebem `config.instrumentVersion` do runner.

## Resultado observado

| Braço | TP | FN | FP piso | P | R | F1 piso |
|---|---:|---:|---:|---:|---:|---:|
| `normative` | 5 | 11 | 3 | 62,5% | 31,3% | 41,7% |
| `none` | 5 | 11 | 1 | 83,3% | 31,3% | 45,5% |

Quatro dos cinco TPs de cada braço são uma única família, V-05, expandida para quatro elementos
por `.link-opcao`. A quinta família diverge: `normative` acertou V-03a; `none` acertou V-02.
Logo, os dois braços detectaram **2/10 famílias**; a diferença aparente vem da geometria do
casamento e das sobras, não de cobertura superior demonstrada.

## Diagnóstico causal

1. **Detecção e grounding estavam acoplados.** O braço `normative` descreveu corretamente V-08 em
   `input.br-input`, mas citou uma regra genérica de governança porque `get_component_spec`
   oferecia a restrição `rootClass/tags` sem id citável. O scorer converteu uma detecção correta
   com citação ruim simultaneamente em FN e FP.
2. **V-03b é relacional.** O braço `none` descreveu a mensagem dinâmica e a ausência de live
   region, mas ancorou a afirmação no formulário. O gabarito ancorava apenas no `<p>` criado após
   submit. A remediação pode morar no próprio `<p>` ou num contêiner; um único nó não representa
   toda a relação.
3. **A unidade por elemento superponderou clones.** Um achado sobre quatro links respondeu por 80%
   dos TPs. A unidade continua útil para medir completude por instância, mas não pode ser a única
   lente publicada.
4. **Duas alegações vieram do KB e ficaram fora do gabarito.** Skip link exige adjudicação
   independente como possível lacuna. Footer é inferência não sustentada: a regra citada diz que o
   Template Base é ponto de partida; não torna o rodapé obrigatório por si só.
5. **O tratamento era `normative`, não `combined`.** Houve 19 consultas normativas e nenhum
   scanner determinístico. O par mede acesso a normas/especificações, não o desempenho do sistema
   completo.
6. **Reflow ficou sem evidência.** `browser_resize` foi negado nos dois braços. A simetria preserva
   o contraste, mas não a cobertura prometida pelo protocolo.

## Regra de interpretação

Este par não demonstra que `none` foi melhor. Até adjudicação independente, ambas as precisões são
pisos. Mesmo depois dela, a unidade experimental é uma única repetição. O par serve como fixture de
regressão do instrumento e como evidência de por que grounding, ancoragem e detecção precisam ser
reportados separadamente.

## Checklist detalhado de implementação — `fluxo-1.1.0`

### A. Preservação e versionamento

- [x] Registrar modelo, cliente, effort, perfil, commits, caminhos e hashes da R1 neste dossiê.
- [x] Manter os JSONs e logs originais sem reescrita retrospectiva.
- [x] Elevar `_meta.version` do gabarito de fluxo para `1.1.0`.
- [x] Fazer o runner gravar `config.instrumentVersion` em toda execução nova e no manifesto.
- [x] Elevar o validator para `2.1.0`, pois a superfície normativa mudou; não reutilizar `2.0.0`
      para dois contratos diferentes.
- [x] Fazer o scorer recusar agregação entre versões diferentes do instrumento; runs legadas sem
      rótulo devem aparecer em grupo próprio com aviso explícito.

### B. Identidade semântica e grounding

- [x] Expor em `get_component_spec` uma lista `constraints[]` com ids estáveis já compartilhados
      pelo checker, incluindo `ds-structure-input-tag`.
- [x] Manter a regra de V-08 como `ds:structure-input-tag`; a normalização aceita a forma do
      checker, sem criar alias falso para uma regra ampla de governança.
- [x] Acrescentar o veredito `deteccao-correta`: credita a unidade após julgamento humano, mas não
      aumenta `ruleVerifiedTP`.
- [x] Exibir a taxa de grounding explícito separada da detecção no scorer de fluxo.
- [x] Expor caveat quando a fonte normativa é truncada; ela não pode implicar subcomponentes ou
      regiões não declarados, cobrindo a inferência indevida de footer.
- [ ] Adjudicar a R1 por revisor independente: V-08 deve ser avaliada como detecção correta com
      grounding incorreto, não como alias automático.
- [ ] Adjudicar skip link e footer separadamente; só incorporar skip link ao gabarito se o escopo
      e a fonte sustentarem a obrigação. Footer não entra sem regra explícita.

### C. Ancoragem relacional

- [x] Estender o contrato com `relatedSelectors[]`.
- [x] Resolver os seletores relacionados contra a mesma árvore canônica do gabarito.
- [x] Permitir casamento por participante relacionado sem multiplicar candidatos ou crédito.
- [x] Reportar quantos TPs usaram âncora relacional.
- [x] Atualizar o protocolo para exigir sujeito principal estreito e participantes explícitos.
- [x] Criar teste sintético no qual formulário + mensagem casa V-03b uma única vez.
- [ ] Adjudicar a sobra histórica do braço `none` como detecção correta/âncora histórica somente
      se o revisor independente confirmar que a descrição identifica materialmente V-03b.

### D. Clusters e métricas

- [x] Preservar a métrica micro por elemento para completude das instâncias.
- [x] Acrescentar cobertura por família V-spec: `detectadas` (ao menos uma instância) e `completas`
      (todas as instâncias).
- [x] Criar regressão mostrando quatro TPs micro para `.link-opcao`, mas uma família macro.
- [ ] Definir antes da primária qual é a métrica principal. Recomendação: cobertura por família
      como leitura causal principal; micro por elemento como completude operacional.
- [ ] Acrescentar intervalo/média somente depois de 3–5 runs da mesma configuração; uma R1 nunca
      recebe linguagem de superioridade.

### E. Protocolo e permissões

- [x] Autorizar `mcp__playwright__browser_resize` no perfil de execução.
- [x] Fazer `test:pipeline` falhar se resize voltar a ser removido enquanto reflow estiver no método.
- [x] Instruir o agente a não usar regra ampla para justificar obrigação estrutural específica.
- [ ] Executar smoke dos dois braços e confirmar no log que resize não foi negado.
- [ ] Executar preflight formal; qualquer falha bloqueia medida e não é corrigida durante a bateria.

### F. Desenho experimental

- [ ] Rotular tabelas pelo perfil real (`none`, `normative`, `deterministic`, `combined`), nunca
      apenas “sem/com oráculo”.
- [ ] Medir `normative − none`: ganho do acesso normativo sem scanner.
- [ ] Medir `deterministic − none`: ganho do scanner.
- [ ] Medir `combined − deterministic`: ganho normativo mantendo scanner presente.
- [ ] Medir `combined − normative`: ganho do scanner mantendo normas presentes.
- [ ] Manter `evidence` como contraste próprio ou capacidade constante; não misturá-lo implicitamente.
- [ ] Não agregar perfis, modelos, clientes, efforts, protocolos, validators ou instrumentos distintos.

### G. Gates antes de nova medida pontuada

- [x] Testes do validator verdes, incluindo ids de constraint e caveat de inferência (145/145),
      e build TypeScript concluído.
- [x] `npm run typecheck`, `npm run lint:protocol`, `npm run lint:skills`, `npm run test:flow` e
      `npm run test:pipeline` verdes no eval.
- [ ] Quatro árvores git limpas e commits de instrumento registrados.
- [ ] Adjudicação independente da R1 registrada sem alterar os artefatos brutos.
- [ ] Smoke pareado bem-sucedido.
- [ ] Preflight formal bem-sucedido.
- [ ] Só então iniciar nova bateria pontuada; falha ou timeout encerra o par sem repetição ad hoc.
