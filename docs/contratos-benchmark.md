# Contratos do benchmark isolado (M0)

Este documento explica os arquivos que as peças do benchmark novo trocam entre si: quem escreve cada
um, quem lê, o que cada campo de estado quer dizer e quais regras impedem que um número apareça sem
sustentação. Ele é o método; o plano em curso (ordem dos marcos, tarefas T1–T8) fica em
`thesis-workspace/planejamento/atual/plano-implementacao-benchmark-isolado-2026-10-02.md`.

Em uma frase: cada execução do agente (braço **sem** ou **com** oráculo) vira um pacote de arquivos
JSON com formato fixo e versionado. A análise só abre um pacote que passa nesses formatos, e o painel
só mostra o que eles contêm. Nada é inferido do nome de uma pasta.

## Onde estão as coisas

| O quê | Onde |
|---|---|
| Schemas (JSON Schema draft 2020-12) | `contracts/*.v1.schema.json` |
| Definições comuns (hashes, caminhos, estados, métricas) | `contracts/common.v1.schema.json` |
| Tipos TypeScript + validador | `contracts/index.ts` (`validateContract`, `assertContract`, `crossCheckRun`, `checkPlannedAbsence`, `checkAggregation`) |
| Exemplos válidos e inválidos | `contracts/examples/valid/`, `contracts/examples/invalid/` |
| Teste | `npm run test:contracts` (`scripts/test-contracts.ts`) |

O validador usa Ajv 8 (`ajv`, dependência de desenvolvimento fixada em 8.20.0). Ele aplica o schema e
mais umas poucas regras que um schema não consegue expressar (caminhos repetidos, vínculos de hash
dentro do mesmo documento, data da ausência planejada). Cada erro sai com o caminho no JSON, a
palavra-chave da regra e uma mensagem; regras próprias começam com `x-`.

**Os exemplos são fixtures sintéticas.** Todos têm `"fixture": true`, usam a tela inventada
`tela-fixture` e textos como "valor sintético". Nenhum vem de execução real nem de gabarito. Um
documento real grava `"fixture": false`, e `checkAggregation` recusa juntar os dois.

O endereço `https://govbr-eval.invalid/...` no `$id` de cada schema é só um nome. O domínio `.invalid`
não existe de propósito; nada é baixado da rede.

## Versão dos contratos

Todo documento declara o contrato no campo `contract` (por exemplo `"run.v1"`), e o arquivo do schema
tem a versão no nome (`run.v1.schema.json`). Uma mudança que torne um documento antigo ilegível ou
mude o significado de um campo cria `v2` ao lado do `v1`; o `v1` não é editado depois que houver
dado real gravado nele.

## Os contratos, um por um

### `campaign.json` — a campanha

**Para que serve.** Diz o que se pretende medir antes de medir: piloto ou formal, objetivo, hipóteses,
telas, braços, modelos, esforço, número de repetições, ordem, versões fixadas (protocolo, cliente,
provedor, navegador, Playwright MCP, política de isolamento, oráculo, scorer), limites, política de
tentativas e de falhas, política de linha de base, plano de análise e orçamento aprovado.

**Quem escreve.** A preparação, antes da coleta. Uma campanha `formal` precisa estar congelada
(`frozenAt`) e com orçamento aprovado; um piloto pode ficar aberto.

**Quem lê.** O controlador da coleta (para saber o que rodar e com que limites), a análise (para
conferir a ausência planejada de linha de base e o plano de análise) e o painel.

Regras que o schema cobra: ordem `aleatorio` exige semente, as outras não podem ter; orçamento não
aprovado tem valor `null` (nunca 0); ausência planejada só no caminho de análise `individual`, para
uma tela do desenho, declarada até o congelamento.

### `run.json` — uma tentativa de execução

**Para que serve.** A identidade e o estado de uma tentativa: campanha, slot, par, run, número da
tentativa, chave de idempotência, tela, braço, repetição, modelo, provedor, esforço, cliente,
navegador, hashes de protocolo/prompt/skill/site, commit do harness, a intervenção (oráculo ou
nada), limites, horários, estado do ciclo de vida, os cinco estados mínimos, falha, submissão e
consumo.

**Quem escreve.** O controlador da coleta. O agente nunca escreve neste arquivo; o que o agente
declara sobre si (por exemplo o nome do modelo dentro do relatório) não sobrescreve nada aqui.

**Quem lê.** A análise, o publicador e o painel.

Pontos que vale entender:

- **Modelo pedido e modelo resolvido.** `model.requested` é o que se pediu. `model.resolved` é o ID que
  o fornecedor devolveu, com a fonte (`provider-response` ou `client-log`) e o caminho da evidência no
  pacote. Quando o fornecedor não expõe, grava-se `"unknown"` com fonte `unknown`. Copiar o pedido para
  o resolvido sem evidência é inválido (exemplo `run--model-id-invented.json`).
- **Intervenção.** `intervention.oracle` é `null` no braço sem e a identidade do pacote do oráculo no
  braço com. É a única diferença prevista entre os braços.
- **Submissão.** `accepted` (o coletor aceitou; `findings.json` existe, mesmo com lista vazia),
  `refused` (recusado; o corpo fica arquivado com o motivo) ou `none` (nada chegou). Zero achados e
  "não enviou" são coisas diferentes e nunca se confundem.
- **Consumo.** Cada número é `{ value, status, source }`. Medido tem valor e fonte; indisponível é
  `{ "value": null, "status": "unavailable" }`. Zero com `unavailable` é inválido. Custo estimado
  (`estimatedCostUsd`) e cobrança efetiva (`billedCostUsd`) ficam separados; assinatura ou crédito
  não viram custo zero.

### `findings.json` — o relatório aceito do agente

**Para que serve.** Guardar o relatório que o agente enviou, ligado ao run, sem mudar seu formato.
O campo `report` é exatamente o contrato atual: o mesmo que `skills/evaluate-screen/SKILL.md` pede e
que o coletor confere com `validateFlowReport` em `scripts/flow-contract.ts` (achado `achado-2`).
Cada achado tem `selector`, `relatedSelectors` (opcional), `rule` (texto ou `null` quando a atribuição
é incerta — o campo é obrigatório), `observed`, `expected`, `state` (largura e altura reais da janela e
os passos) e `evidence`. A unidade de avaliação do scorer não muda.

**Quem escreve.** O coletor, ao aceitar uma submissão (envelope: campanha, run, horário, recibo).

**Quem lê.** A análise (que monta o pacote de revisão com o código que já existe) e o painel.

Só existe para submissão aceita. `"findings": []` é resultado válido — o agente olhou e não encontrou
nada. Ausência de submissão aparece no `run.json`, não aqui. O teste confere que todo exemplo válido
também passa no `validateFlowReport` atual e normaliza como `achado-2`.

### `isolation.json` — as provas de isolamento

**Para que serve.** Registrar o que o harness verificou antes e durante a execução: versão da
política, cada check (categoria, alvo, se é obrigatório, resultado, evidência), controles positivos,
ferramentas anunciadas e observadas, capacidades observadas, caminhos não exercitados e limitações.

**Quem escreve.** O harness. Nunca o agente.

**Quem lê.** O controlador (um check obrigatório falho impede chamar o modelo), a análise e o painel.

`result: "passed"` exige pelo menos um check, todos os obrigatórios aprovados e pelo menos um
controle positivo aprovado — o controle prova que o alvo bloqueado existe, para que a negativa não
seja explicada por alvo inexistente. "Passou" sem checks é inválido
(`isolation--passed-without-checks.json`). `failed` exige um check ou controle falho que o explique.

### `artifact-manifest.json` — o inventário do pacote

**Para que serve.** Listar cada arquivo do pacote com caminho relativo, tamanho, tipo, papel e hash,
mais quem produziu e as versões de schema.

**Quem escreve.** O controlador, ao fechar o pacote.

**Quem lê.** A análise e o publicador, que validam o manifesto antes de abrir ou publicar qualquer
coisa.

Caminho com `..`, absoluto, com barra invertida ou letra de unidade é inválido: um pacote não aponta
para fora de si (`artifact-manifest--path-escapes-package.json`). Arquivo de referência ou de revisão
(`ground-truth*.json`, `reviews.json`, `adjudications.json`) nunca pode estar num pacote de execução.
Há exatamente um arquivo com papel `run`, e caminhos repetidos são recusados.

### `baseline.json` — o registro de uma linha de base arquivada

**Para que serve.** Ligar o resultado bruto de uma linha de base ao que ele mediu. O formato do bruto
**não** é redefinido: continua sendo o `FlowBaselines` de `scripts/run-baselines-flow.ts`
(`linha-de-base-fluxo-2.x`). Este registro aponta para ele (hash + local) e repete só o que a análise
confere antes de abrir: status (`complete`/`failed`), escopo, versão, horários, tentativa, e o vínculo
ao manifesto de coleta, ao site, à referência e ao plano de estados/viewports. O bloco `identity`
espelha a `ExecutableIdentity` de `scripts/collection-manifest.ts`, campo por campo.

**Quem escreve.** O job de linhas de base (T4), separado da coleta do agente.

**Quem lê.** A análise (T6), antes de preparar o pacote de revisão.

Só o escopo `bateria` é registrável; o avulso `dev-global` nunca é confrontável. Os rótulos
comparáveis são os mesmos que `semantic-flow-cli.ts` já grava (`linha-de-base/validator-nao-guiada`,
`linha-de-base/axe`); o validator guiado fica como diagnóstico. Status `failed` exige o erro. Uma
repetição técnica é um novo registro com `rerunOf` e motivo, nunca sobrescrita. O validador confere
que os hashes de site, referência e plano em `links` coincidem com `identity`.

### `snapshot-manifest.json` — as cópias para reprodução

**Para que serve.** Garantir que uma análise possa ser refeita sem o computador original: aponta para
cópias imutáveis dos bytes do site servido, da referência, do plano de estados/viewports e do código
do instrumento (mais locks, oráculo, scorer quando for o caso).

**Quem escreve.** A preparação e o arquivamento (T1/T4).

**Quem lê.** A análise e o teste de restauração (M3).

Cada item tem hash **e** local recuperável (`location`). Hash ou commit sem acesso aos bytes é
inválido (`snapshot-manifest--hash-without-location.json`). Os quatro tipos obrigatórios (site,
referência, plano, instrumento) têm de estar presentes. Todo item declara `exposedToAgent: false`:
nada disso entra na raiz do agente.

Tipos de local aceitos: `package-path` (dentro do próprio pacote), `archive-repo` (repositório de
arquivo + caminho), `git-commit-path` (repositório + commit + caminho) e `external-store` (URL
`https://`, para evidência grande — pendente da decisão NAT-46).

### `analysis-binding.json` — o que a análise usou

**Para que serve.** Dizer, num lugar só, quais execuções, qual conjunto de snapshots, qual referência,
qual versão do scorer e qual linha de base uma análise usou — ou por que não há linha de base, ou por
que a análise está bloqueada. Também carrega o estado da pontuação e as métricas que o painel mostra.

**Quem escreve.** A análise (T6), antes de pontuar.

**Quem lê.** O painel (T8a) e o teste de restauração.

As regras de compatibilidade de uma análise composta continuam em `scripts/analysis-manifest.ts`
(`manifesto-analise-1.0.0`); este contrato só registra o manifesto usado. O bloco `scorer` espelha
`analysisIdentity()` de `scripts/collection-manifest.ts`.

## Política de ausência de linha de base

A linha de base é exigida. Há três situações possíveis no `analysis-binding.json`:

| `baseline.mode` | Quando | O que acontece |
|---|---|---|
| `used` | Linha de base completa e compatível | A análise segue. Na análise composta, registra também a bateria designada e por que essa linha de base foi a escolhida. |
| `planned-absence` | A campanha declarou, **antes da coleta**, que essa tela não terá linha de base, com justificativa | Só no caminho individual (o mesmo `--no-baseline "motivo"` que já existe). O validador confere que a declaração é anterior ao início da coleta, e `checkPlannedAbsence` confere que ela está na campanha, para a mesma tela, com o mesmo texto. |
| `blocked` | A linha de base falhou, faltou sem previsão ou é incompatível | A análise fica bloqueada: `status: "blocked"`, motivo explícito, `scoreStatus: "not-prepared"` e todas as métricas `null`. O resumo técnico e o pacote bruto continuam disponíveis. |

Falha ou incompatibilidade **nunca** é convertida em ausência planejada para liberar o scorer. Uma
ausência "declarada" depois do início da coleta é recusada
(`analysis-binding--absence-declared-after-collection.json`), e a análise composta não aceita ausência
nenhuma (`analysis-binding--composite-planned-absence.json`). Refazer a linha de base gera um novo
registro ligado à mesma identidade congelada, sem repetir o agente.

## Estados, em linguagem comum

Não existe um único "deu certo". Uma execução pode ter funcionado tecnicamente e ainda estar esperando
revisão — e isso é normal.

**Ciclo de vida** (`run.lifecycle.state`): `planned` (no plano) → `preparing` (montando o ambiente) →
`preflight` (checks antes do modelo) → `running` (agente rodando) → `collected` (pacote fechado) →
`archived` (pacote confirmado no arquivo). Pode terminar antes em `failed` (falhou), `interrupted`
(cortado no meio: timeout, cancelamento, máquina perdida) ou `not-started` (nem começou). Nesses três
casos, `stage` diz em que etapa foi.

| Estado | Valores | O que quer dizer |
|---|---|---|
| `technical` | `passed` · `failed` · `interrupted` · `not-run` | A execução rodou até o fim e o relatório foi aceito? `not-run` = o modelo nunca foi chamado (por exemplo, o preflight falhou) — não é falha do modelo. `passed` exige submissão aceita; código de saída 0 sozinho não basta. |
| `isolation` | `passed` · `failed` · `unverified` | As provas de isolamento passaram? `unverified` = não houve prova suficiente. |
| `protocol` | `adherent` · `non-adherent` · `unverified` · `not-applicable` | O agente seguiu o protocolo (inclusive enviar o relatório)? `not-applicable` quando não rodou. |
| `oracleUsage` | `absent-verified` · `used-adherent` · `available-unused` · `used-with-errors` · `unverified` · `not-applicable` | No sem: `absent-verified` = confirmado que o oráculo não estava lá. No com: usou como o protocolo pede, estava disponível e não usou, usou com erros. O braço sem nunca pode dizer que usou; o braço com nunca pode dizer `absent-verified`. |
| `score` | `not-prepared` · `pending-review` · `provisional` · `final` · `not-applicable` | A pontuação ainda não foi preparada, espera revisão, é provisória (há pendências) ou é final. `not-applicable` quando não há submissão para pontuar. "Provisório/final" vem do scorer, não de um botão. |

Os nomes `not-run` e `not-applicable` foram acrescentados aos estados mínimos do plano para que uma
falha de preparação não pareça falha do modelo, como o próprio plano pede.

**Métricas indisponíveis são `null`, nunca 0.** Vale para consumo no `run.json` e para recall,
precisão etc. no `analysis-binding.json`.

## Chave de comparação

Duas execuções só entram na mesma comparação se forem iguais em: tela e versão; hashes de protocolo,
prompt, skill e site; cliente e versão; modelo pedido e resolvido; provedor e forma de autenticação;
esforço; navegador, versão e modo headless; Playwright MCP; limites; política de isolamento;
referência (versão e hash); scorer (versão, hash e política de aceitação). O braço e o oráculo da
intervenção ficam de fora — são a diferença prevista. Dentro do braço com, o oráculo tem de ser o
mesmo em todas as execuções.

`checkAggregation` aplica isso: qualquer diferença fora do desenho bloqueia a agregação e diz qual
campo divergiu. Quando o modelo resolvido é `unknown` em todas, a agregação passa com um aviso: a
identidade fica presumida só pelo ID pedido. É a mesma régua de `DIMENSOES_TODAS` /
`DIMENSOES_POR_BRACO` em `scripts/analysis-manifest.ts`, estendida aos campos novos.

## Mapa de acessos

Copiado do plano ("Fronteiras de acesso e modelo de ameaça"). São fronteiras de acesso, não só
pastas.

| Componente | Pode ler | Não pode ler |
|---|---|---|
| Preparação confiável | Fontes e dependências fixadas; exportação por lista de arquivos permitidos | Não envia conteúdo de pesquisa no pacote de coleta |
| Controlador da coleta | Pacote mínimo, `campaign.json`, configuração e sinais de supervisão | Gabarito, arquivo de campanhas anteriores |
| Cliente/agente | Prompt comum, ferramentas permitidas, a própria saída | Controle do runner, arquivo de resultados, tese, GitHub/Drive, HOME pessoal, `run.json`/`isolation.json` de qualquer execução |
| Navegador | A tela selecionada e a submissão da própria execução | Outras telas, painel, serviços de controle, rede externa, arquivos locais |
| Oráculo (só no com) | Pacote normativo fixado, a tela permitida e o estado da própria execução | Gabarito, decisões de revisão, histórico de outras execuções |
| Análise/revisão | Pacotes encerrados, `baseline.json`, `snapshot-manifest.json`, referência congelada e decisões | Não envia nada de volta a uma execução em curso |
| Publicador | Pacotes validados (`artifact-manifest.json`) e o destino de arquivo configurado | Não executa scripts vindos dos achados ou das transcrições |

## Decisões pendentes

Estas decisões não impedem os contratos, as fixtures e os testes. Cada uma trava uma etapa posterior.

| Decisão | Issue no Linear | Responsável | Trava |
|---|---|---|---|
| Nomes, visibilidade e acesso dos repositórios (telas, arquivo de resultados) | NAT-45 | autora | Criação/publicação remota |
| Onde guardar evidência grande (repositório, LFS, armazenamento externo) e retenção | NAT-46 | autora | Aceite do arquivo em T4; local do tipo `external-store` |
| Cliente, ID exato do modelo, esforço e autenticação | NAT-47 | autora | Prova com o cliente real e T5 |
| Orçamento do piloto, timeout e teto de tentativas | NAT-48 | autora | Qualquer chamada paga nova; valores de `limits` e `retryPolicy` |
| Google Drive: pasta, autenticação e formato | NAT-49 | autora | Só a ativação do adaptador Drive |
| Hospedagem e acesso ao painel | — | não atribuído | Publicação do painel (não o painel local de T8a) |
| N, desfecho primário, incerteza e regras de exclusão | — | não atribuído | T7 (`analysisPlan` de uma campanha formal) |
| Capacidade de revisão e quem revisa | — | não atribuído | Dimensionar a campanha formal e fechar score final |
| Créditos de Claude cloud sessions | — | não atribuído | Só uma escolha que dependa dessa cobertura |

## Escolhas feitas aqui que o plano deixava em aberto

- `technical` ganhou `not-run`; `protocol` e `oracleUsage` ganharam `not-applicable`; `score` ganhou
  `not-applicable` (sem submissão).
- `findings.v1` é estrito nos campos do achado (os mesmos oito que o contrato atual conhece); campos
  desconhecidos são recusados, como o plano pede para o coletor.
- Relatório recusado não vira `findings.json`: fica como `submission.refusal` no `run.json`, com o
  corpo arquivado — a mesma separação de `recusa-arquivada` em `scripts/flow-contract.ts`.
- Métricas de consumo têm forma `{ value, status, source }` para que "indisponível com 0" seja
  detectável; métricas de análise são números ou `null`, obrigatoriamente `null` com análise
  bloqueada ou não preparada.
- `model.resolved: "unknown"` em todas as execuções agrega com aviso, em vez de bloquear.
