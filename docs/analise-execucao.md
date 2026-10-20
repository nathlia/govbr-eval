# Análise de uma execução ou de um par (T6)

`npm run analisar` pega **um** pacote de execução do benchmark isolado, ou **um** par sem/com, confere
tudo o que chega, monta a fila de revisão com o scorer que já existe e escreve um resumo que dá para
ler sem abrir JSON. Não chama modelo nenhum. O navegador roda headless: é a mesma reconstrução da
página congelada que `semantic-flow-cli.ts prepare` faz, nos dois ramos — sem navegação (uma cena por
janela) e com navegação (D-60, uma cena por segmento; a tela B `vistorias`).

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
   avaliada (`report.appUrl`, só o pathname) é a da referência. Uma referência que navega (D-60) é
   aceita desde o NAT-51: o pacote tem uma cena por segmento (`1280x900@<última parada>`), e
   `revisao/capture.json` diz, por cena, o segmento e a entrada direta usada (se houve).
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

## Revisão §8 de campanha nova (NAT-78: passada cega, consistência, confiabilidade, adjudicação)

Para uma campanha v2 nova (trio sem/ferramentas/com), a revisão do protocolo NAT-78 §8 segue esta ordem. Todo comando
exige as pastas explicitamente (nunca cai na fila histórica da NAT-74) e nunca sobrescreve arquivo com outro conteúdo
(versão nova = pasta nova). Nenhum deles julga nem chama modelo: os juízes e adjudicadores são subagentes novos e
cegos, que recebem só os arquivos indicados.

1. Primeira passada cega: `npx tsx scripts/reanalise-nat74/e14-campanha.ts --analise <análise> --saida <passada>` →
   juiz por lote → `npx tsx scripts/reanalise-nat74/e14-ingerir.ts --fila <passada>` (congela `julgamentos.json` + sha256).
2. Consistência (triagem): `npm run revisao:consistencia -- --passada <passada> --saida <revisao>`.
3. Confiabilidade, **antes** da adjudicação: `npm run revisao:confiabilidade -- amostra --passada <passada> --saida <revisao>`
   (até 40 cartões idênticos, estratos braço mascarado × classe, semente da campanha ou declarada) → 2 juízes por
   cartão em `<revisao>/confiabilidade/respostas/amostra-NN-j1.json` / `-j2.json` →
   `npm run revisao:confiabilidade -- medir --passada <passada> --amostra <revisao>/confiabilidade` (κ de Fleiss e Cohen
   por campo com denominadores; congela as respostas e `desacordos.json`). `--juiz-passada <outra passada>` é só para
   ensaio (juiz substituto).
4. Adjudicação informada: `npm run revisao:adjudicacao -- preparar --passada <passada> --confiabilidade <revisao>/confiabilidade
   --saida <revisao>` cria uma unidade por gatilho mecânico (`<revisao>/adjudicacao/regras.md`): (a) grupo divergente,
   (b) desacordo de juiz da amostra com a 1ª passada em classe/crédito/fato/aplicabilidade/vínculo, (c)
   `estadoAlcancado: nao-alcancado`. Para cada `lote-dNN`: adjudicador novo responde a etapa A
   (`respostas/lote-dNN-a.json`) → `npm run revisao:adjudicacao -- revelar --passada <passada> --adjudicacao
   <revisao>/adjudicacao --lote lote-dNN` → o mesmo adjudicador responde a etapa B → `npm run revisao:adjudicacao -- aplicar
   --passada <passada> --adjudicacao <revisao>/adjudicacao --saida <pasta nova>`, que grava a passada adjudicada
   (1ª passada preservada em `julgamentos-1a-passada.json`) e `contestados.json` (insumo do S4').
5. Recálculo (§8.5 + §6.3): `npm run revisao:recalculo -- --passada <passada adjudicada ou 1ª passada> [--passada …]
   --saida <pasta nova> [--analise DIR] [--coleta coleta-trio.json] [--residuo-passada P] [--ratificacoes ARQ]` grava
   `tabela.md`, `recalculo.json` e `recalculo.json.sha256`. Cada análise listada na passada é um trio (o trio, a ordem dos
   braços e a linha de base vêm do `coleta-trio.json` dela; análise anterior à `coleta:trio` exige `--coleta` cujas
   execuções escolhidas sejam as do pacote). Cada cartão julgado vira uma decisão do scorer do pacote (um átomo com todos
   os sujeitos; as unidades da spec do vínculo saem da ancoragem estrita, com vínculo de revisão pela árvore medida onde
   ela não chega — a regra do E8), e as unidades confirmadas por execução são as do `scoreSemanticPackage` (crédito por
   unidade, scorer 1.8.2). D por comparação do `design.comparisons` (D = 2º braço − 1º: D_fc = com − ferramentas, D_sc =
   com − sem, D_sf = ferramentas − sem), sempre por spec no primário (D-102): na tela D sobre as 9 não expostas (13
   como sensibilidade), na tela A sobre as 12 A-* (as 14 unidades A-* como sensibilidade por instância; P-* à parte); política 1.2.0 e, ao lado, 1.1.0 (sem R15 nem Q1 a); S4' sem os créditos de
   cartões de `contestados.json` que a autora não ratificou (sem `--ratificacoes`, nenhum), nos dois braços; checagem S4
   por braço com o resíduo de braço (`residuo-de-braco.json` da passada ou de `--residuo-passada`, casado pelo cartão).
   Permutação, Wilcoxon-Pratt, sinal, IC bootstrap e a leitura com δ = 2 pela `estatistica-pareada.ts`. Toda entrada lida
   entra com sha256 em `recalculo.json › entradas`; sem isso nada é gravado. Testes: `npm run test:revisao-recalculo` (inclui a equivalência da vinculação copiada de `montar.ts` contra o próprio
   `montarDecisoes`, em todo cartão × spec de pacotes reais: deriva da cópia falha o teste).

Código: `scripts/reanalise-nat74/revisao-campanha.ts` e `recalculo-campanha.ts`; testes: `npm run test:revisao-campanha`,
`npm run test:revisao-recalculo`. O caminho retrospectivo (`reanalise:nat74:e14-consistencia` / `e14-desempate`,
`pipeline.ts`) não muda.

## Determinismo

`summary.json → hashes.conteudoCientificoSha256` é o hash de tudo que é científico no resumo: estado,
linha de base, execuções sem os links, comparação, versões e esforço de revisão. Ficam de fora os
horários operacionais e os caminhos desta máquina. Rodar duas vezes com as mesmas entradas dá o
mesmo hash, o mesmo `packageHash`, o mesmo `reviewHash` e o mesmo `score.json`, byte a byte. O teste
confere isso. O `sceneHash` inclui a captura da página. Em outra máquina, com outro Chromium ou
outras fontes, a captura pode mudar, e aí mudam os ids de cartão (é a mesma propriedade do
`semantic-flow-cli.ts`).

**O que a captura fixa para o hash não depender do dia nem da carga** (adaptador 1.2.0, NAT-67;
`scripts/identidade-cartoes.ts`, fora de `SCORER_FILES`):

- **Relógio.** Todo contexto do navegador do preparo (inclusive a entrada direta do D-60) abre no
  fuso `America/Sao_Paulo`, com o relógio da página instalado no `createdAt` do conjunto de snapshots
  (`clock.install`: corre em tempo real a partir dali, então temporizadores e `debounceTime`
  continuam funcionando). Motivo: o calendário (flatpickr) da tela A marca o dia de hoje
  (`<span class="flatpickr-day today" aria-current="date">`). Até o 1.1.0, recalcular em 05/10 os
  pares p02–p09 da `t7-tela-a-01`, capturados em 04/10, trocava o dia marcado. Com isso mudavam o
  `sceneHash` e todos os ids de cartão. Em p02 e p06, o cartão que aponta `.flatpickr-day.today`
  passava a resolver outro dia, ficava com corpo diferente e voltava pendente. O p01 e o p10 só
  reproduziam porque a `rev-002` deles foi capturada depois da meia-noite. `capture.json → relogio`
  registra o instante, o fuso, a origem e a regra.
- **Ids gerados.** Um id terminado em dígitos é tratado como gerado quando não aparece no site
  congelado como **token inteiro**. O `br-select` sorteia `list-${0..9999}`, e `list-1` aparece dentro
  de `.fa-list-1-2` no CSS do Font Awesome: com a busca por substring, a carga que sorteasse
  `list-1` deixaria o id cru no hash.
- **APP_ID do Angular (tela B).** Com encapsulamento emulado, o Angular 15 sorteia um APP_ID de 3
  letras a cada carga. Ele aparece no nome dos atributos (`_ngcontent-baa-c16`, `_nghost-baa-c16`) e
  no CSS dos `<style>` gerados. É renomeado para `#a1`. Duas preparações seguidas da Vistorias
  diferiam só nisso, e agora dão o mesmo `sceneHash` (o teste confere).

**A `t7-tela-a-01` com o 1.2.0** (recálculo dos 10 pares numa cópia do `govbr-resultados`):
- p02–p09 reproduzem a `rev-002` com o mesmo `sceneHash` (`d61fc365…`) e os mesmos ids de cartão;
  o `summary.json` é igual, a menos da versão do adaptador, dos hashes que a contêm e dos carimbos.
- O p01 e o p10 voltam ao `sceneHash` da `rev-001` (`d61fc365…`, contra o qual as decisões deles
  foram gravadas). Com isso, as decisões se aplicam sem transposição. Partindo da `rev-002` deles
  (`ef016931…`), `mapearDecisoes` transpõe 29/29 e 28/28 por corpo idêntico.
- Resultado: 0 pendentes, comparação final nos 10 pares; D por par 0, +2, 0, +1, −1, 0, −1, −2,
  +1, 0; A-* 85/140 nos dois braços; P-* 0/20 sem e 17/20 com.
- **Limite.** A página reconstruída vê o dia do conjunto de snapshots, não o dia de cada execução.
  Se uma campanha atravessar uma virada de data ou de mês, a alegação de um agente sobre "hoje" pode
  resolver outro dia na reconstrução. Isso não é silencioso: o cartão mostra o elemento resolvido.

## Limites

- **Os dois ramos vêm de `scripts/preparo-cenas.ts`, que é uma cópia do CLI (NAT-51).** O ramo sem
  navegação, o ramo segmentado (`janelasSegmentadas`, `prepararJanelaSegmentada`) e `baselineRuns`
  foram copiados texto a texto de `semantic-flow-cli.ts prepare` para um módulo que a análise importa.
  O CLI **não** foi tocado, de propósito: ele está em `SCORER_FILES`, o hash do scorer entra no
  contexto do pacote e, por ele, no id de todo cartão, e `mapearDecisoes` recusa transpor decisões
  entre scorers diferentes. Mover o código para fora do CLI deixaria as campanhas congeladas
  (`t7-tela-a-01`, rev-002 final) sem recálculo: todos os cartões voltariam pendentes. Com o CLI
  intacto, o hash continua `7ceb07e3…d146` e a versão continua `flow-semantic-1.5.0`. O
  `preparo-cenas.ts` não entra no hash, porque não decide o que um pacote significa: unidades,
  cartões e pontuação continuam em arquivos do hash.
- **A cópia é vigiada.** `npm run test:analisar` recorta as regiões de `REGIOES_DO_CLI` nos dois
  arquivos, por âncoras e sem indentação, e exige texto igual. Se falhar, o CLI mudou: ressincronize o
  `preparo-cenas.ts`. Na próxima mudança de versão do scorer, que muda o hash de qualquer jeito, o CLI
  passa a importar o módulo e a guarda sai.
- **Prova de que nada mudou para a tela A** (feita numa cópia do `govbr-resultados`). Recalculados
  os 10 pares da `t7-tela-a-01`, o código antigo e o novo deram `package.json`, `reviews.json`,
  `score.json`, bindings e `summary.json` iguais, a menos dos carimbos de hora. O `scene-0.html` e o
  `capture.json` diferem só pelos ids sorteados do `br-select`, que o `sceneHash` já normaliza
  (os dois códigos rodaram no mesmo dia; entre dias diferia também o dia marcado no calendário, ver
  "Determinismo" e NAT-67). O
  `piloto-01` está congelado na 1.4.0 e é recusado pelos dois códigos (trava do D-84).
- **Tela B no painel.** Liberada: o painel prepara o par da tela que navega como qualquer outro, e a
  fila pede a cena num cartão segmentado (`docs/painel-resultados.md`).
- **Linha de base da tela B (NAT-34).** Na Vistorias o axe acha nós dentro de shadow roots dos web
  components do DS (cena inicial: 12 de 41 nós, `button-name` do `br-button` de olho e `label` do
  `br-input` de data). Até a `linha-de-base-fluxo-2.1.0` o alvo era `target.flat().join(" ")`, um
  seletor de descendente que não atravessa o shadow root: 0 dos 12 resolviam e nenhum oferecia unidade
  candidata (B-07, B-05). A 2.2.0 junta os trechos com ` >>> ` (`alvoDoAxe`), o separador que o
  resolvedor (`anchors.ts`) e o oráculo já usam: 12 de 12 resolvem. Nó fora de shadow root sai igual
  (na tela A, 2 de 2 nós idênticos), e o `scan_page` do validator já escreve ` >>> ` nos locators.
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

Com a opção `telaReal` (NAT-51), o construtor troca a página e a referência inventadas por um site
congelado e uma referência reais, que são só lidos. O site é servido da pasta original e a referência
é copiada byte a byte. Execuções, achados, campanha e linha de base continuam sintéticos, sob uma tela
de id próprio de fixture. O teste da referência que navega usa o `govbr-telas`, clonado ao lado do
`govbr-eval`, com a `ground-truth-vistorias.json` 1.0.0 sem alteração. O teste confere uma cena por
segmento, na ordem do plano (3 cenas e 102 unidades), o segmento em `capture.json` e uma linha de
base por segmento. Sem o clone, o caso é pulado e aparece como PULADO na saída.

```bash
F=scripts/fixtures/analise/gerado
npm run analisar -- --sem $F/pacotes/sem --com $F/pacotes/com --campanha $F/campanha.json \
  --snapshots $F/snapshots.json --referencia $F/referencia.json --site $F/site \
  --linha-de-base $F/linha-de-base/registro.json --saida /tmp/analise-fixture
```

Testes: `npm run test:analisar`.
