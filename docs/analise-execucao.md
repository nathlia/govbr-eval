# Análise de uma execução ou de um par (T6)

`npm run analisar` pega **um** pacote de execução do benchmark isolado, ou **um** par sem/com, confere
tudo o que chega, monta a fila de revisão com o scorer que já existe e escreve um resumo que dá para
ler sem abrir JSON. Não chama modelo nenhum. O navegador roda headless: é a mesma reconstrução da
página congelada que `semantic-flow-cli.ts prepare` faz.

Os contratos que ele lê estão em [`contratos-benchmark.md`](contratos-benchmark.md). A pontuação, os
cartões e o vocabulário das decisões estão em [`semantic-scoring.md`](semantic-scoring.md). Este
documento só diz como as duas coisas se encaixam.

## O comando

```bash
npm run analisar -- --sem PACOTE_SEM --com PACOTE_COM \
  --campanha campaign.json --snapshots snapshot-manifest.json \
  --referencia referencia.json --site PASTA_DO_SITE_CONGELADO \
  --linha-de-base baseline.json \
  --saida PASTA_NOVA
```

Para um pacote só, troque `--sem/--com` por `--pacote PASTA`.

| Opção | O que é |
|---|---|
| `--pacote` ou `--sem` + `--com` | Pasta(s) do pacote de execução: `artifact-manifest.json`, `run.json`, `findings.json` (se a submissão foi aceita), `isolation.json`, evidências. |
| `--campanha` | O `campaign.json` (campaign.v1) da coleta. |
| `--snapshots` | O `snapshot-manifest.json` (snapshot-manifest.v1). Precisa ter exatamente um item `site`, um `reference` e um `state-plan`. |
| `--referencia` | O arquivo da referência congelada. O sha256 dele tem de ser o do item `reference` dos snapshots. |
| `--site` | A pasta do site congelado (`site-manifest.json` + `site/`, o formato de `measurement-surface.ts`). O sha256 do `site-manifest.json` tem de ser o do item `site` e o `siteManifestSha256` de cada `run.json`. |
| `--linha-de-base` | O registro `baseline.json` (baseline.v1) que T4 arquiva. O bruto (`FlowBaselines`) é achado pelo `raw.location` do registro. |
| `--sem-linha-de-base` | No lugar de `--linha-de-base`: usa a ausência **planejada** que a campanha declara para a tela. Não aceita motivo digitado na hora. |
| `--tipo composta` | Análise composta. Exige `--manifesto-analise`, `--bateria-designada` e `--justificativa`. O padrão é `individual`. |
| `--arquivo` | Raiz local do repositório de arquivo, para resolver locais `archive-repo`. Locais `package-path` são resolvidos a partir da pasta do documento que os cita. |
| `--decisoes` | Um `reviews.json` com as decisões da revisora. Só entram as decisões dos cartões deste pacote (`scopeReviews`). |
| `--anterior` | A pasta de uma análise anterior das mesmas execuções. A nova sai como revisão seguinte e aponta para essa. |
| `--orcamento-revisao` | Orçamento de revisão declarado antes de revisar (o mesmo campo do pacote semântico). |
| `--revisao-completa` | Grava também `revisao/review-completo.md`, sem cegueira. O padrão é só a renderização cega. |
| `--saida` | Pasta **nova**. Se já existir, o comando recusa antes de ler qualquer coisa. |

Código de saída: `0` = análise pronta, `3` = bloqueada (resumo técnico gravado), `1` = recusada ou erro
de uso.

## O que ele confere, em ordem

1. **Pacote.** O `artifact-manifest.json` passa no contrato. Cada arquivo listado existe, é arquivo
   comum (não link simbólico), tem o tamanho e o sha256 declarados e fica dentro da pasta. Qualquer
   arquivo da pasta que **não** esteja no manifesto recusa o pacote. `run.json`, `findings.json` e
   `isolation.json` passam no contrato, e `crossCheckRun` confere que os três falam do mesmo run e
   que a submissão bate com a existência de `findings.json`.
2. **Campanha.** Mesmo `campaignId`. Tela, braço e modelo pedido estão no desenho. Fixture e dado real
   nunca se misturam.
3. **Snapshots, referência e site.** Os três coincidem por hash entre si e com o `run.json`. A página
   avaliada (`report.appUrl`) é a da referência. **Uma referência que navega (D-60) é recusada.**
   Veja "Limites".
4. **Linha de base.** Aplica a política abaixo.
5. **Par.** Os dois pacotes passam por `checkAggregation` (a chave de comparação de M0) e precisam ter o
   mesmo `pairId`. Qualquer diferença fora do desenho bloqueia a análise e o resumo diz qual campo
   divergiu.

Uma falha nos passos 1 a 3 **recusa** a análise. A pasta de saída recebe só `summary.md` e
`summary.json` dizendo o motivo, sem número nenhum. Uma falha nos passos 4 e 5 **bloqueia** a análise.
Nesse caso todos os arquivos são gravados, o resumo técnico fica completo e as métricas ficam `null`.

## Política de linha de base, como aplicada aqui

| Situação | Resultado no `analysis-binding` |
|---|---|
| Registro completo, bruto íntegro e identidade igual à da coleta | `baseline.mode: "used"`. As varreduras comparáveis (validator não guiado e axe) entram no pacote como execuções revisadas, como sempre. |
| `--sem-linha-de-base`, a campanha declara a ausência para esta tela antes do início da coleta, caminho individual | `planned-absence`, conferido por `checkPlannedAbsence`. |
| `--sem-linha-de-base` e a campanha não declara | `blocked` / `missing-unplanned`. |
| `--sem-linha-de-base` numa análise composta | `blocked` / `missing-unplanned`: a composta exige linha de base. |
| Ausência declarada depois do início da coleta | `blocked` / `missing-unplanned`: isso é falta, não plano. |
| Registro ou bruto com `status: failed` | `blocked` / `baseline-failed`. O bruto parcial não é tocado. |
| Bruto com outro hash, versão ilegível, escopo `dev-global`, outra campanha ou tela, outra identidade (referência, site, plano, oráculo, coleta), vínculos fora do conjunto de snapshots, passadas diferentes das cenas do plano | `blocked` / `incompatible`, com a lista do que divergiu. |

"A identidade da coleta" é montada a partir das próprias entradas: o sha256 da referência, o do site,
o hash do plano de estados, o oráculo fixado na campanha e `FLOW_INSTRUMENT_VERSION`. O registro é
comparado com ela, e o bruto com o registro (`compareIdentities`). Falha ou incompatibilidade
**nunca** vira ausência planejada. Refazer a linha de base gera um registro novo, e basta rodar a
análise de novo apontando para ele. O agente não roda outra vez.

## O adaptador: pacote novo → scorer existente

O scorer não mudou. `SCORER_FILES`, as fórmulas e a unidade de avaliação continuam os mesmos.
Mudou só a porta de entrada:

- `findings.v1` vira o `FlowAgentResults` que o pacote semântico já recebia. Os achados (`achado-2`)
  passam como vieram. `model` é o `model.requested` do `run.json` (do controlador). O que o agente
  diz sobre si (`report.model`) só aparece como `agentReportedModel` quando diverge. `config` traz
  cliente, esforço, perfil do oráculo, hash do protocolo, `siteManifestSha256` e
  `instrumentVersion = fluxo-1.3.0`.
- A evidência da execução são os arquivos de papel `evidence` do manifesto, já conferidos por hash. O
  índice fica com `dir: "pacote:<runId>"`, que é um rótulo e não um caminho, e com
  `integrity.indexSha256` igual ao sha256 do `artifact-manifest.json`.
- O id da execução dentro do pacote é o `runId`.
- A linha de base vira as duas execuções `linha-de-base/validator-nao-guiada` e `linha-de-base/axe`,
  pela mesma conversão do `semantic-flow-cli.ts`.
- **Submissão recusada ou ausente não entra no pacote.** A pontuação dessa execução fica
  `not-applicable`, com métricas `null`, e o resumo diz "recusada pelo coletor" ou "nenhuma
  submissão". Nunca diz "zero achados". O corpo recusado fica linkado no resumo.
- Execução com submissão aceita e `isolation: failed` fica **em quarentena**: binding `blocked`,
  fora da análise principal.

O que se perde nessa conversão: o envelope do coletor (`receivedAt`, `receipt`) e o consumo de
`run.json` não entram no pacote semântico. Ficam no resumo, que lê os originais.

## Saídas

```text
PASTA_NOVA/
  summary.md                 o resumo para ler (PT-BR)
  summary.json               a mesma coisa em dados, para o painel
  analysis-binding.sem.json  contrato analysis-binding.v1, um por execução
  analysis-binding.com.json
  score.json                 saída do scorer (scores, comparações com a linha de base, filas, proveniência)
  revisao/                   pacote de revisão: package.json, reviews.json, review.md (cego), capture.json,
                             scene-N.html/png, resolution-N.json, esforco-revisao.json
  entradas/                  cópias de campanha, snapshots, referência, registro/bruto da linha de base,
                             manifesto de cada pacote e decisões usadas
```

Há **um binding por execução** porque o contrato tem um único bloco `metrics`, e um par tem dois
conjuntos de métricas. Os dois bindings de um par compartilham referência, scorer, snapshots e linha
de base. É o par deles que `checkAggregation` confere.

`revisao/` e `score.json` só existem quando houve o que pontuar: análise não bloqueada e pelo menos
uma execução com submissão aceita.

### Estados

| Campo | Valores e quando |
|---|---|
| `summary.json` → `analise.estado` | `pronta` · `bloqueada` (linha de base ou par) · `recusada` (integridade ou contrato) |
| binding → `status` | `ready` · `blocked` (análise bloqueada ou execução em quarentena) |
| binding → `scoreStatus` | `final`: o scorer diz `complete`. `provisional`: há cartão pendente ou sem resolver. `pending-review`: nenhum cartão desta execução decidido. `not-applicable`: sem submissão aceita. `not-prepared`: bloqueada. |
| binding → `metrics` | `recall` = `referenceRecall` e `precision` = `referencePrecision`, D/(D+F). Os dois são `null` enquanto a revisão não fecha. `confirmedReferenceUnits`, `incorrectClaims` e `newCorrect` contam o que já foi decidido. `pending` é o número de cartões pendentes. Bloqueada ou sem submissão: tudo `null`. |

## O resumo

`summary.md` segue a ordem do plano: status técnico, identidade, resultado científico, comparação
com − sem (só para pares), MCP e isolamento, custo e tempo, e detalhes com links. Os números vêm
**só** da saída do scorer. Recall e precisão aparecem "indisponível" enquanto houver pendência, nunca
0. Consumo não medido aparece "desconhecido". A comparação de par lista as unidades por spec (só
com, só sem, os dois, nenhum), dá a diferença com − sem e traz a nota "n = 1 par, sem inferência".
Nenhum braço é declarado vencedor.

Todo texto que veio do agente, ou que pode citá-lo (achados, seletores, motivos de recusa), passa
por escape: HTML vira entidade, a pontuação de markdown leva barra invertida e `://` e `www.`
deixam de virar link automático. Os únicos links do resumo apontam para arquivos do próprio pacote
e da própria análise.

## Como revisar e recalcular

1. Abra `revisao/review.md`. É a renderização cega: o texto em que o agente narra as próprias
   ferramentas fica retido. Não abra `revisao/package.json` enquanto decide.
2. Escreva as decisões numa cópia de `revisao/reviews.json`, com o vocabulário de
   [`semantic-scoring.md`](semantic-scoring.md): `defeito-do-gabarito`, `defeito-novo-correto`,
   `incorreta`, `duplicada` ou `evidencia-insuficiente`.
3. Rode de novo com as **mesmas** entradas mais
   `--decisoes <reviews.json> --anterior <pasta da análise anterior> --saida <pasta nova>`.

A preparação é determinística: mesmas entradas e mesmas versões dão o mesmo pacote e os mesmos ids
de cartão, então as decisões se aplicam. Sai uma revisão nova (`revisao.numero` + 1) que aponta para
a anterior pelo hash do conteúdo científico. O pacote bruto e a análise anterior não mudam.

`npm run score:fluxo` **não** serve para estes pacotes. Ele confere a evidência por um caminho
relativo ao `govbr-eval`, e aqui a evidência é conferida pelo manifesto do pacote na hora da
análise. Recalcular é rodar `analisar` de novo.

## Determinismo

`summary.json → hashes.conteudoCientificoSha256` é o hash de tudo que é científico no resumo: estado,
linha de base, execuções sem os links, comparação, versões e esforço de revisão. Ficam de fora os
horários operacionais e os caminhos desta máquina. Rodar duas vezes com as mesmas entradas dá o
mesmo hash, o mesmo `packageHash`, o mesmo `reviewHash` e o mesmo `score.json`, byte a byte. O teste
confere isso. O `sceneHash` inclui a captura da página. Em outra máquina, com outro Chromium ou
outras fontes, a captura pode mudar, e aí mudam os ids de cartão (é a mesma propriedade do
`semantic-flow-cli.ts`).

## Limites

- **Referência que navega (D-60) é recusada por enquanto.** O ramo de cenas por segmento do
  `semantic-flow-cli.ts` não é exportado, e hoje a tela B (`vistorias`) navega; a tela A
  (`solicitacao`) não. A correção planejada, registrada pelo orquestrador, é exportar o ramo
  segmentado do CLI sob uma decisão nova. Para conferir, os pacotes das baterias fechadas são
  preparados de novo e têm de dar pontuações idênticas. Depois disso o espelho daqui é apagado.
- **O espelho é vigiado.** `baselineRuns` e o ramo sem navegação de `prepare` existem em cópia neste
  arquivo. `npm run test:analisar` delimita essas regiões no `semantic-flow-cli.ts` por âncoras e
  confere o hash delas contra o valor fixado em `ESPELHO_CLI` (`analisar-execucao.ts`). Se o teste
  falhar, o CLI mudou: ressincronize o espelho e atualize o hash.
- **Na composta, só se liga o manifesto de análise** (hash e cópia). As regras de composição de
  `scripts/analysis-manifest.ts` falam de baterias antigas. Para pacotes novos, a compatibilidade é
  o `checkAggregation`.
- **Erros de ferramenta** são contados em `tool-events.ndjson` (eventos com `isError: true`). Se o
  formato não for reconhecido, aparecem como desconhecidos.
- Nenhuma sugestão de decisão por LLM. Isso é etapa posterior e opcional.

## Fixture

`scripts/fixtures/analise/` é inteiramente sintético. Tem uma página inventada (`pagina/`), uma
referência inventada com 3 specs (`referencia-fixture.json`) e o construtor `construir.ts`, que
monta site congelado, campanha, snapshots, linha de base (registro + bruto) e os pacotes sem e com.
`npm run fixture:analise -- PASTA_NOVA` reconstrói tudo. A cópia em `gerado/` é conferida contra uma
reconstrução em `npm run test:analisar`. Todo documento grava `fixture: true` e nunca entra em
campanha científica.

```bash
F=scripts/fixtures/analise/gerado
npm run analisar -- --sem $F/pacotes/sem --com $F/pacotes/com --campanha $F/campanha.json \
  --snapshots $F/snapshots.json --referencia $F/referencia.json --site $F/site \
  --linha-de-base $F/linha-de-base/registro.json --saida /tmp/analise-fixture
```

Testes: `npm run test:analisar`.
