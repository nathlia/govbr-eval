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
nvm use 25.2.1                      # o corpus e os scripts precisam de Node 20+

# terminal 1
cd "F:\Dev Nath\TCC\govbr-corpus"; npm run dev

# terminal 2
cd "F:\Dev Nath\TCC\govbr-eval"; npm run dashboard

# terminal 3
cd "F:\Dev Nath\TCC\govbr-eval\pipeline"
.\run-battery.ps1 -Runs 1 -Arm com          # uma execução, para conferir o encanamento
.\run-battery.ps1 -Runs 3 -Arm ambos        # bateria completa: 3 com + 3 sem

# OpenAI pelo Codex incluído no app desktop; gpt-5.6-luna é o padrão econômico desse provider
.\run-battery.ps1 -Provider codex -Scope smoke -Suite fluxo -Arm ambos
```

Parâmetros: `-Runs` (1–10) · `-Arm` (`com` | `sem` | `ambos`) · `-Provider` (`claude` | `codex`) ·
`-Model` · `-CorpusUrl` · `-DashboardUrl` · `-SkipBaselines` · `-SkipScore` · `-PreflightOnly`.

No provider `codex`, o runner localiza primeiro o comando no `PATH` e depois o executável incluído
no app desktop. Ele exige um login válido, desativa shell, busca web, regras e configuração pessoal,
injeta o protocolo no prompt e usa um diretório temporário vazio como raiz. Assim o modelo recebe
somente o protocolo, a invocação e os MCPs desta condição — não o repositório.

O script recusa a partida se o Node for < 20, se o oráculo não estiver compilado ou se o corpus
não responder — falhas que hoje só aparecem no meio da execução.

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

No braço com oráculo, `GOVBR_VALIDATOR_TOOL_PROFILE=evaluation` expõe somente oito ferramentas. As
varreduras isoladas, inspeção de estilos, listagem e persistência continuam disponíveis no perfil
`full`, mas na bateria são substituídas por `scan_page`, ledger, consultas focadas e pelo endpoint
do dashboard. O inventário e a migração estão em `docs/mcp-tool-profiles.md`.

## Como os braços são rotulados

O scorer é **ciente de configuração** (D-17): ele varre `results/runs/`, `results/runs-ablacao/` e
`results/runs-piloto/`, agrupa por braço, modelo, cobertura, cliente, esforço de raciocínio,
hash do protocolo e versão do validator, e **nunca** agrega grupos diferentes. Média ± DP só sai
dentro de um grupo.

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

- cliente e versão, modelo, versão do validator e SHA-256 do protocolo comum + especialização;
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

**O que ainda falta:** a comparação lado a lado entre os braços. O scorer hoje avisa que a ablação
não existe, mas não emite a tabela comparativa — isso exige os dois braços com n >= 3 na mesma
cobertura.
