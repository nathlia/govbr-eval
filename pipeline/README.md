# pipeline/ — bateria formal e ablação

Automatiza as execuções exigidas por **F3** (3–5 execuções, média ± DP), **F4** (custo por
execução) e **F2** (ablação: agente com × sem oráculo). Decisão de projeto: **D-16** no
`thesis-workspace/tcc2-decisions-log.md`.

## Por que isto existe

A bateria formal são 3–5 execuções **vezes** duas configurações. Feito à mão, isso é:

- trabalhoso e propenso a variação humana entre execuções (o que polui a medida de
  não-determinismo que o F3 quer justamente isolar);
- dependente de lembrar de abrir uma sessão limpa a cada vez, sob pena de contaminar o resultado.

Cada execução aqui é um subprocesso novo de Claude Code ou `codex exec --ephemeral`: contexto
próprio, nenhuma memória da execução anterior nem de quem disparou o script. O isolamento do
gabarito (D-01/D-02) passa a ser uma propriedade do procedimento, não uma lembrança.

## Arquivos

| Arquivo | Papel |
|---|---|
| `mcp-com-oraculo.json` | Braço principal: `govbr-ds-validator` + Playwright |
| `mcp-sem-oraculo.json` | Braço da ablação: **só** Playwright |
| `settings-run.json` | Regras de negação de leitura — o isolamento do gabarito imposto pelo harness |
| `run-battery.ps1` | Orquestrador |
| `logs/` | Saída bruta, manifesto, configuração MCP efetiva e telemetria NDJSON por execução |

## Uso

```powershell
cd "F:\Dev Nath\TCC\govbr-eval\pipeline"
.\run-battery.ps1 -Suite fluxo -PreflightOnly            # build, isolamento e superfície; nenhum modelo
.\run-battery.ps1 -Suite fluxo -Scope smoke -Arm ambos   # encanamento, fora do scorer
.\run-battery.ps1 -Suite fluxo -Runs 3 -Arm ambos        # bateria: 3 com + 3 sem

# OpenAI pelo Codex incluído no app desktop; gpt-5.6-luna é o padrão econômico desse provider
.\run-battery.ps1 -Provider codex -Scope smoke -Suite fluxo -Arm ambos
```

Nenhum servidor precisa estar de pé: o runner compila o corpus e sobe a própria superfície de
medida. O painel não participa da medida (ver abaixo).

Parâmetros: `-Runs` (1–10) · `-Arm` (`com` | `sem` | `ambos`) · `-Provider` (`claude` | `codex`) ·
`-Model` · `-ReasoningEffort` (`low`–`max`) · `-OracleProfile` (`normative` | `deterministic` |
`evidence` | `combined`) · `-Schedule` (`alternado` | `sequencial`) · `-SkipBaselines` · `-SkipScore` ·
`-PreflightOnly`.

## Identidade congelada, agenda e linha de base (fatia 6)

Antes da primeira execução o runner:

1. compila o **oráculo** e o corpus a partir da fonte;
2. grava o **plano** (`logs/<stamp>-plano.json`): slots em ordem, agenda (`alternado` por padrão:
   `com1 sem1 · sem2 com2 · com3 sem3`), orçamento de tentativas = número de slots, sem retry, sem
   semente (não há sorteio);
3. grava o **manifesto de coleta** (`logs/<stamp>-coleta/manifesto.json`, `scripts/collection-manifest.ts`)
   com a identidade efetiva — hash do `dist/` e do `data/` do oráculo, do manifesto do site congelado,
   do gabarito e do plano de estados —, commit/árvore suja/lock dos três repos, versões de cliente,
   Playwright e navegadores, a descrição da superfície e o hash do plano. Faltou um campo, nada é
   gravado e a bateria não parte. Ao lado ficam as cópias do oráculo compilado (`oraculo/`) e do
   gabarito (`referencia/`).

Durante a coleta, cada execução é conferida contra o manifesto (`collection-manifest.ts verify`): um
build do oráculo no meio da bateria marca a execução `identity-changed` e interrompe as seguintes. Cada
execução leva `collectionManifestSha256` no manifesto da bateria e em `config`. Uma interrupção (limite
de gasto, evidência, identidade) deixa os slots restantes como `nao-tentada`, com o motivo.

### Janela de uso da assinatura (medido em 18/09)

As execuções da bateria e a sessão interativa da autora gastam a MESMA janela. Duas baterias
pararam no slot 4 por limite — 17/09 23:35 e 18/09 12:54, esta última às 13:03 com 429
`session limit`, três execuções pagas arquivadas e US$ 3,97 sem série nenhuma. A janela que
estourou levou US$ 6,37 da bateria completa das 09:15, US$ 0,33 do smoke pareado das 12:48 e
US$ 3,97 da bateria interrompida, mais o uso interativo.

Escopo full, suíte fluxo, opus-5 `high`: a bateria de 6 slots custa ~US$ 6,4 e leva ~13 min de
parede. O braço com oráculo sai por US$ 1,35–1,73 e o sem por US$ 0,72–0,97, com 0,5 a 1,16 milhão
de tokens de leitura de cache por execução. Cabe UMA bateria por janela; a bateria mais a repetição
dela não cabe.

Enquanto a coleta correr pela assinatura: abrir a janela com a bateria e ficar fora do Claude
interativo durante os ~13 min. Não há consulta de saldo da janela por linha de comando — o que
existe é o `-Scope smoke` (~US$ 0,15 por braço) para conferir se o limite já liberou.

Depois da coleta:

- **Linha de base da bateria** → `logs/<stamp>-linha-de-base.json`, nunca sobrescrita, medida contra a
  tela congelada (bytes servidos conferidos) e sob o manifesto: uma passada por janela do plano, com
  axe, validator **não guiado** (o comparável) e **guiado** (diagnóstico), achados brutos, resolução,
  janela, estado e tempos. Falha grava o parcial com `status: failed` e a bateria falha.
- **Pacote de revisão** → `results/semantic-review/<stamp>/`, preparado com o manifesto, a linha de base
  e o site congelado exatos. Não é preparado se a coleta foi interrompida.
- `logs/<stamp>-diario.ndjson`: diário só de acréscimo (plano, manifesto, início/fim de cada execução,
  slots não tentados, estágios). `logs/<stamp>-desfecho.json`: estado final de cada estágio e o erro,
  gravado em sucesso **e** em falha. Mensagem final de sucesso só depois de todos os estágios exigidos.

## Superfície de medida (v02, D-40)

Até o v01 o agente salvava o relatório navegando até o painel (`:4000`), e o painel servia a raiz
inteira do `govbr-eval` por `/@fs` — gabaritos e resultados inclusive. O prompt dizia para não
olhar; nada impedia. Agora cada bateria sobe `scripts/measurement-surface.ts`:

| Servidor | Porta | Alcançável pela execução | Papel |
|---|---|---|---|
| site | 3100 | sim | a tela congelada: só os arquivos do fechamento de `fluxo.html` no build de produção, conferidos por sha256; o resto é 404 |
| coletor | 4100 | sim | `POST /api/submit` da execução armada; reenvio idêntico devolve o mesmo recibo, relatório diferente é recusado e arquivado; sem relatório aceito, o desarme arquiva a última recusa como relatório da execução (`recusa-arquivada`) |
| controle | 4101 | não | o runner arma e desarma cada execução; o nome do arquivo sai do `runId`, nunca do texto do agente |
| proxy | 4102 | — | todo pedido do navegador passa por ele, loopback incluído; só site e coletor seguem, HTTPS é negado |

Os dois braços recebem o mesmo Playwright MCP com `--proxy-server`, `--isolated` e
`--block-service-workers`; o oráculo recebe `GOVBR_VALIDATOR_PROXY_SERVER` e
`GOVBR_VALIDATOR_ALLOWED_ORIGINS`, porque o navegador dele abre a URL que o agente escolher.

O preflight roda `npm run test:isolation` antes de qualquer chamada de modelo: sobe a superfície,
liga o painel como alvo real, confere de fora da política que o gabarito responde nele e, pela
mesma configuração MCP das execuções, tenta alcançá-lo por navegação, `fetch`, frame, worker,
redirecionamento e pelo `scan_page` do oráculo. Falhou, a bateria não parte. O resultado fica em
`logs/<stamp>-isolamento.json`; a superfície da bateria, com o site congelado, a caixa de entrada e
o log do proxy, em `logs/<stamp>-superficie/`. O manifesto guarda, por execução, o recibo do
coletor e o que o proxy negou enquanto ela esteve armada.

A suíte TC-* ainda salva pelo painel e por isso não roda no v02.

## Evidência da execução (fluxo-1.3.0)

O Playwright MCP grava snapshots e capturas na raiz temporária da execução, e é a eles que o campo
`evidence` de cada achado se refere. Antes de apagar essa raiz, o runner copia tudo para
`logs/<runId>-evidencia/` com `evidence-index.json` (caminho, bytes e sha256 de cada arquivo). O passo
é o mesmo nos dois braços; nenhuma configuração muda entre eles. O manifesto guarda `evidence` (pasta,
arquivos, bytes e sha256 do índice) e o artefato da execução guarda `config.evidenceDir` e
`config.evidenceIndexSha256`. O pacote de revisão resolve as referências contra essa cópia.

O coletor (`surface-1.2.0`) exige o contrato do achado de `fluxo-1.3.0` — `observed`, `expected`,
`rule` (ou `null`), `state` e `evidence` —, responde 400 com a lista de erros e arquiva como veio todo
corpo recusado. Uma execução que termina sem relatório aceito não some: o desarme arquiva a
**última** recusa como relatório dela, com `receipt.status = "recusa-arquivada"`, o motivo e o arquivo
promovido. O runner imprime o aviso, grava no manifesto `submission.status` e
`submission.promotedFrom` e, no artefato, `config.submissionStatus` e `config.refusedSubmission`; o
corpo recusado segue byte a byte em `collector.rawBody`. O pacote de revisão rotula esses achados
`recusado` (ou `malformado`), nunca `achado-2`.

No provider `codex`, o runner localiza primeiro o comando no `PATH` e depois o executável incluído
no app desktop. Ele exige um login válido e desativa shell, busca web, regras e configuração pessoal.

**Nos dois providers** (D-36), o runner injeta o protocolo no prompt e usa um diretório temporário
vazio, descartado ao final, como raiz de cada execução. No `claude`, a execução roda com
`--restricted`: as configurações de usuário, projeto e local são ignoradas (só `settings-run.json`
vale), as ferramentas de arquivo ficam confinadas à raiz temporária, e shell e WebFetch saem.
Assim o modelo recebe somente o protocolo, a invocação e os MCPs desta condição — não o
repositório, nem o que uma execução anterior gravou em disco.

Até o `fluxo-1.1.0` o `claude` partia de `F:\Dev Nath\TCC`. Ali o Playwright MCP deixava os
arquivos de cada execução (`final-findings.json`, snapshots em `.playwright-mcp/`), legíveis pela
seguinte e pelo outro braço; e o cliente herdava WebSearch/WebFetch do `settings.local.json` do
projeto e o TCC inteiro pelo `additionalDirectories` do usuário. O smoke pareado de 14/09 mostrou
os arquivos; uma sonda confirmou que a configuração nova nega cada um desses caminhos.

O script recusa a partida se o Node for < 20, se o build do oráculo ou do corpus falhar, se o
isolamento falhar ou se o manifesto de coleta ficar incompleto — falhas que antes só apareciam no
meio da execução.

## Duas decisões embutidas que importam para a metodologia

**1. Os dois braços são simétricos por construção.** As configurações MCP diferem em exatamente
uma coisa: a presença do servidor do oráculo. Modelo, protocolo, navegador e permissões de arquivo
são idênticos. Sem essa simetria a ablação não é interpretável — qualquer outra diferença viraria
explicação concorrente para o resultado.

**2. As permissões de negação são parte do experimento, não higiene.** `settings-run.json` bloqueia
a leitura de `ground-truth.json`, de `results/`, `docs/`, `reports/`, do fonte do corpus, de
`ds-rules/` e do próprio `govbr-ds-validator/`.

As duas últimas são as que sustentam a ablação: se o agente **sem** oráculo pudesse ler a base de
conhecimento direto do disco, ele teria o conhecimento do oráculo por outro caminho e a ablação
mediria nada. O protocolo antes *pedia* ao agente que não olhasse; agora o harness **impede**.

No braço com oráculo, `-OracleProfile` seleciona uma superfície causal: `normative` expõe somente
fundamentação externa, `deterministic` somente scanner + ledger, `evidence` somente inspeção bruta,
e `combined` preserva o pacote compacto anterior. O runner injeta o perfil na configuração MCP,
grava-o em `RunConfig.oracleProfile` e o scorer o inclui na chave de agrupamento. Assim, execuções
com normas, scanner ou pacote combinado nunca são somadas por acidente. O perfil `full` continua
reservado ao desenvolvimento fora da bateria.

## Como os braços são rotulados

O scorer é **ciente de configuração** (D-17): ele varre `results/runs/`, `results/runs-ablacao/` e
`results/runs-piloto/`, agrupa por braço, modelo, cobertura, cliente, esforço de raciocínio,
perfil causal do oráculo, hash do protocolo e versão do validator, e **nunca** agrega grupos
diferentes. Média ± DP só sai dentro de um grupo.

Na suíte de fluxo, o runner também grava `config.instrumentVersion` a partir do gabarito. O scorer
recusa por padrão qualquer execução de outra versão ou sem rótulo; `--include-incompatible` existe
somente para diagnóstico histórico e nunca autoriza agregação com a medida atual.

O diretório é o que informa o braço, e por isso o script move os arquivos da ablação para
`results/runs-ablacao/` ao final de cada execução — não é mais contorno, é a convenção que rotula.
Uma execução pode sobrescrever o rótulo declarando um bloco `config` no próprio JSON
(`{ "arm": "sem-oraculo", "label": "..." }`).

A cobertura do corpus é **derivada**, nunca declarada: o scorer conta quantos casos do gabarito
atual a execução de fato julgou. Foi assim que o piloto apareceu como grupo separado sem precisar
de metadado nenhum — ele julgou 26 de 52 casos, logo não é comparável.

## Telemetria e enriquecimento automático

O agente ainda produz o veredito, mas não é mais a fonte autoritativa para configuração e custo.
Depois que o subprocesso termina, o runner anexa ao artefato arquivado:

- cliente e versão, modelo efetivo, esforço, perfil causal do oráculo, versão do validator e
  SHA-256 do protocolo comum + especialização e versão do instrumento;
- tokens de input, criação/leitura de cache, raciocínio e output informados pelo cliente;
- custo monetário, turnos e tempo de parede;
- chamadas, erros, bytes de entrada/saída e duração do MCP do validator, total e por ferramenta.

O validator grava cada chamada em um sidecar `*-mcp.ndjson`. Esses dados não são incluídos nas
respostas MCP e, portanto, não aumentam o contexto visto pelo modelo. O sidecar mede apenas o MCP
do validator; chamadas do Playwright continuam representadas pelo campo geral `toolCalls` informado
pelo cliente.

Claude registra o custo monetário informado pelo próprio cliente. Login ChatGPT no Codex fornece
tokens e chamadas, mas não um valor monetário por execução; por isso o runner não fabrica
`totalCostUsd` para essas rodadas.

O modelo efetivo vem do argumento do runner, não do texto produzido pelo agente. Se o agente
escrever outro rótulo, o runner normaliza `model` e preserva o original em
`config.agentReportedModel`. `reasoningEffort` é passado explicitamente aos dois clientes. O campo
`turns` permanece um contador nativo do fornecedor e é rotulado como tal: não é unidade comparável
entre Codex e Claude Code.

**O que ainda falta:** a comparação lado a lado entre os braços. O scorer hoje avisa que a ablação
não existe, mas não emite a tabela comparativa — isso exige os dois braços com n >= 3 na mesma
cobertura.
