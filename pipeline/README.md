# pipeline/ — bateria formal e ablação

Automatiza as execuções exigidas por **F3** (3–5 execuções, média ± DP), **F4** (custo por
execução) e **F2** (ablação: agente com × sem oráculo). Decisão de projeto: **D-16** no
`thesis-workspace/tcc2-decisions-log.md`.

## Por que isto existe

A bateria formal são 3–5 execuções **vezes** duas configurações. Feito à mão, isso é:

- trabalhoso e propenso a variação humana entre execuções (o que polui a medida de
  não-determinismo que o F3 quer justamente isolar);
- dependente de lembrar de abrir uma sessão limpa a cada vez, sob pena de contaminar o resultado.

Cada execução aqui é um subprocesso `claude -p` novo: contexto próprio, nenhuma memória da
execução anterior nem de quem disparou o script. O isolamento do gabarito (D-01/D-02) passa a ser
uma propriedade do procedimento, não uma lembrança.

## Arquivos

| Arquivo | Papel |
|---|---|
| `mcp-com-oraculo.json` | Braço principal: `govbr-ds-validator` + Playwright |
| `mcp-sem-oraculo.json` | Braço da ablação: **só** Playwright |
| `settings-run.json` | Regras de negação de leitura — o isolamento do gabarito imposto pelo harness |
| `run-battery.ps1` | Orquestrador |
| `logs/` | Saída bruta de cada execução (`--output-format json`) + manifesto da bateria |

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
```

Parâmetros: `-Runs` (1–10) · `-Arm` (`com` | `sem` | `ambos`) · `-Model` · `-CorpusUrl` ·
`-DashboardUrl` · `-SkipBaselines` · `-SkipScore`.

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

## Como os braços são rotulados

O scorer é **ciente de configuração** (D-17): ele varre `results/runs/`, `results/runs-ablacao/` e
`results/runs-piloto/`, agrupa as execuções por `braço | modelo | cobertura do corpus` e **nunca**
agrega grupos diferentes. Média ± DP só sai dentro de um grupo.

O diretório é o que informa o braço, e por isso o script move os arquivos da ablação para
`results/runs-ablacao/` ao final de cada execução — não é mais contorno, é a convenção que rotula.
Uma execução pode sobrescrever o rótulo declarando um bloco `config` no próprio JSON
(`{ "arm": "sem-oraculo", "label": "..." }`).

A cobertura do corpus é **derivada**, nunca declarada: o scorer conta quantos casos do gabarito
atual a execução de fato julgou. Foi assim que o piloto apareceu como grupo separado sem precisar
de metadado nenhum — ele julgou 26 de 52 casos, logo não é comparável.

**O que ainda falta:** a comparação lado a lado entre os braços. O scorer hoje avisa que a ablação
não existe, mas não emite a tabela comparativa — isso exige os dois braços com n >= 3 na mesma
cobertura.
