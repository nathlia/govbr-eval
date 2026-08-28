<#
.SYNOPSIS
  Bateria formal de avaliação (F3/F4) + ablação (F2) para o TCC 2.

.DESCRIPTION
  Executa N sessões headless do agente sobre o corpus, em uma ou nas duas configurações:

    com  = agente + oráculo MCP (govbr-ds-validator) + Playwright
    sem  = agente + Playwright, SEM o oráculo  <- braço da ablação

  Cada execução é um subprocesso `claude -p` novo: contexto próprio, nenhuma memória da anterior
  nem de quem disparou o script. É isso que satisfaz o isolamento do gabarito (D-01/D-02) sem
  depender de a pessoa lembrar de abrir uma sessão limpa.

  As duas configurações MCP são deliberadamente simétricas: a única diferença entre elas é a
  presença do servidor do oráculo. Tudo o mais — modelo, protocolo, navegador, permissões de
  arquivo — é idêntico, que é o que torna a ablação interpretável.

.NOTES
  Os arquivos do braço "sem" são movidos para results/runs-ablacao/ ao final de cada execução,
  porque `npm run score` varre results/runs/agent-*.json e agregaria os dois braços numa média
  única. Nunca agregue braços diferentes (mesmo princípio do D-13).

.EXAMPLE
  # Conferir o encanamento antes de gastar: uma aba, modelo barato, nada entra em métrica.
  .\run-battery.ps1 -Scope smoke -Arm ambos

  # Medida de verdade.
  .\run-battery.ps1 -Runs 3 -Arm ambos

  # Sensibilidade a modelo: experimento declarado, bateria inteira no outro modelo.
  # O scorer agrupa por modelo, então os dois saem lado a lado sem se misturar.
  .\run-battery.ps1 -Runs 3 -Arm ambos -Model claude-sonnet-5
#>

[CmdletBinding()]
param(
  [ValidateRange(1, 10)]
  [int]$Runs = 1,

  [ValidateSet("com", "sem", "ambos")]
  [string]$Arm = "com",

  # Política de modelo (D-17): opus-5 conduz as execuções de avaliação; fable-5 fica para escrita.
  # F3 exige modelo constante dentro de uma bateria — não troque no meio.
  # Trocar de modelo é um experimento declarado (sensibilidade a modelo): rode a bateria inteira
  # com -Model outro-modelo. O scorer agrupa por modelo, então a comparação sai separada sozinha.
  [string]$Model = "claude-opus-5",

  # full  = corpus inteiro; é o que vale como medida
  # smoke = uma aba só, para conferir encanamento (protocolo, POST, permissões) por ~1/10 do custo.
  #         Execução de fumaça NUNCA é medida: vai para results/runs-smoke/, fora do alcance do scorer.
  [ValidateSet("full", "smoke")]
  [string]$Scope = "full",

  # A aba que o smoke percorre. Qualquer uma serve — o objetivo é exercitar o caminho, não medir.
  [string]$SmokeAba = "Botões",

  [string]$CorpusUrl = "http://localhost:3000",

  [string]$DashboardUrl = "http://localhost:4000",

  [switch]$SkipBaselines,

  [switch]$SkipScore
)

$ErrorActionPreference = "Stop"

$PipelineDir = $PSScriptRoot
$EvalRoot    = Split-Path $PipelineDir -Parent
$TccRoot     = Split-Path $EvalRoot -Parent
$RunsDir     = Join-Path $EvalRoot "results\runs"
$AblacaoDir  = Join-Path $EvalRoot "results\runs-ablacao"
$SmokeDir    = Join-Path $EvalRoot "results\runs-smoke"
$LogsDir     = Join-Path $PipelineDir "logs"
$Stamp       = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"

$IsSmoke = $Scope -eq "smoke"

# Modelo barato por padrão no smoke: ele não mede nada, então não há razão para pagar opus para
# descobrir que o POST funciona. Um -Model explícito continua ganhando.
if ($IsSmoke -and -not $PSBoundParameters.ContainsKey("Model")) {
  $Model = "claude-haiku-4-5"
}

# Baseline e pontuação são sobre a medida, e o smoke não produz medida.
if ($IsSmoke) {
  $SkipBaselines = $true
  $SkipScore     = $true
}

foreach ($d in @($RunsDir, $AblacaoDir, $SmokeDir, $LogsDir)) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

function Write-Step($msg)  { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "  ok  $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "  !!  $msg" -ForegroundColor Yellow }

function Test-Url($url) {
  try {
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null
    return $true
  } catch {
    return $false
  }
}

# ---------------------------------------------------------------- preflight
Write-Step "Verificações preliminares"

$nodeVersion = (& node -v).TrimStart("v")
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 20) {
  throw "Node $nodeVersion está ativo. O corpus (Vite 8) e os scripts (tsx) precisam de 20+. Rode 'nvm use 25.2.1' e tente de novo."
}
Write-Ok "Node $nodeVersion"

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  throw "CLI 'claude' não encontrada no PATH."
}
Write-Ok "CLI claude encontrada"

# A6: o protocolo carrega procedimento apenas. Se conhecimento de domínio vazar para dentro dele,
# o protocolo vira um segundo oráculo e a ablação deixa de medir o que se propõe a medir — então
# a bateria inteira sai inválida. Barrar aqui é mais barato que descobrir depois de gastar as
# execuções. Ver docs/ablation-design.md e o cabeçalho de skills/evaluate-all/SKILL.md.
Push-Location $EvalRoot
try {
  & npm run lint:protocol --silent
  $lintExit = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($lintExit -ne 0) {
  throw "lint:protocol falhou — há conhecimento de domínio dentro de um protocolo. A bateria seria inválida. Corrija antes de rodar."
}
Write-Ok "Protocolos limpos (A6)"

$validatorDist = Join-Path $TccRoot "govbr-ds-validator\dist\index.js"
if (-not (Test-Path $validatorDist)) {
  throw "dist do oráculo não existe em $validatorDist. Rode 'npm run build' em govbr-ds-validator."
}
Write-Ok "Oráculo compilado"

if (-not (Test-Url $CorpusUrl)) {
  throw "Corpus não responde em $CorpusUrl. Rode 'npm run dev' em govbr-corpus."
}
Write-Ok "Corpus no ar em $CorpusUrl"

$dashboardUp = Test-Url $DashboardUrl
if ($dashboardUp) {
  Write-Ok "Dashboard no ar em $DashboardUrl (arquivamento automático)"
} else {
  Write-Warn2 "Dashboard fora do ar. O agente terá que escrever os arquivos por conta própria; o arquivamento em results/runs/ pode falhar. Recomendado: 'npm run dashboard' em govbr-eval."
}

# ---------------------------------------------------------------- plano
$arms = @()
if ($Arm -eq "ambos") { $arms = @("com", "sem") } else { $arms = @($Arm) }

$total = $arms.Count * $Runs
Write-Step "Plano: $total execução(ões) — braços [$($arms -join ', ')] x $Runs, modelo $Model, escopo $Scope"

if ($IsSmoke) {
  Write-Warn2 "ESCOPO SMOKE: só a aba '$SmokeAba'. Não é medida — os vereditos vão para"
  Write-Warn2 "results/runs-smoke/, que o scorer não lê, e baselines/pontuação estão desligados."
}

$manifest = @()
$runIndex = 0

# ---------------------------------------------------------------- execuções
:bateria foreach ($armName in $arms) {
  $mcpConfig = Join-Path $PipelineDir "mcp-$armName-oraculo.json"
  if (-not (Test-Path $mcpConfig)) { throw "Config MCP não encontrada: $mcpConfig" }

  for ($i = 1; $i -le $Runs; $i++) {
    $runIndex++
    Write-Step "[$runIndex/$total] braço '$armName', execução $i"

    # O braço da ablação faz POST no dashboard, e o endpoint sobrescreve o veredito "atual"
    # (results/agent-results.json + a cópia do dashboard). Sem restaurar, a tabela principal do
    # scorer passaria a reportar a ablação como se fosse o braço com oráculo. Guarda antes.
    # O smoke também faz POST no dashboard e sobrescreveria o veredito "atual" — mesma guarda.
    $snapshots = @()
    if ($armName -eq "sem" -or $IsSmoke) {
      foreach ($rel in @("results\agent-results.json", "dashboard\public\agent-results.json")) {
        $full = Join-Path $EvalRoot $rel
        if (Test-Path $full) {
          $sufixo = [guid]::NewGuid().ToString("N").Substring(0, 8)
          $tmp = Join-Path $LogsDir ("restore-" + (Split-Path $rel -Leaf) + "-$sufixo.bak")
          Copy-Item $full $tmp -Force
          $snapshots += [pscustomobject]@{ path = $full; backup = $tmp }
        }
      }
    }

    $before = @()
    if (Test-Path $RunsDir) {
      $before = Get-ChildItem $RunsDir -Filter "agent-*.json" | Select-Object -ExpandProperty Name
    }

    $logFile      = Join-Path $LogsDir "$Stamp-$armName-run$i.json"
    $settingsFile = Join-Path $PipelineDir "settings-run.json"

    # O recorte do smoke vive aqui, no disparo — não dentro do protocolo. O protocolo é o mesmo
    # arquivo nos dois escopos, senão a execução de fumaça deixaria de exercitar o que vai rodar
    # de verdade. A frase abaixo restringe o percurso e nada mais; não diz nada sobre o domínio.
    $prompt = if ($IsSmoke) {
      "/evaluate-all Percorra apenas a aba '$SmokeAba' e feche os vereditos só dos casos dela. " +
      "Ignore as demais abas e as rotas estáticas."
    } else {
      "/evaluate-all"
    }

    $claudeArgs = @(
      "-p", $prompt,
      "--strict-mcp-config",
      "--mcp-config", $mcpConfig,
      "--settings", $settingsFile,
      "--model", $Model,
      "--output-format", "json",
      "--permission-mode", "dontAsk"
    )

    Push-Location $TccRoot
    try {
      $started = Get-Date
      & claude @claudeArgs | Out-File -FilePath $logFile -Encoding utf8
      $exit = $LASTEXITCODE
      $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
    } finally {
      Pop-Location
    }

    if ($exit -ne 0) {
      Write-Warn2 "claude saiu com código $exit. Log: $logFile"
    } else {
      Write-Ok "concluída em ${elapsed}s — log: $logFile"
    }

    # Limite de gasto atingido: as execuções restantes falhariam em sequência, cada uma gravando
    # um log vazio e empurrando a bateria para um estado meio-feito. Já aconteceu duas vezes
    # (19/08 e 27/08). Parar aqui preserva o que foi arquivado até agora e deixa o motivo visível.
    $limiteAtingido = $false
    try {
      $logJson = Get-Content $logFile -Raw | ConvertFrom-Json
      if ($logJson.api_error_status -eq 429) {
        $limiteAtingido = $true
        $motivo = $logJson.result
      }
    } catch { }

    # identifica o arquivo arquivado por esta execução
    $after = Get-ChildItem $RunsDir -Filter "agent-*.json" | Select-Object -ExpandProperty Name
    $novo = $after | Where-Object { $before -notcontains $_ }

    if (-not $novo) {
      Write-Warn2 "Nenhum arquivo novo em results/runs/. O agente pode não ter salvado o veredito — confira o log."
      $arquivo = $null
    } else {
      $arquivo = $novo | Select-Object -First 1
      Write-Ok "veredito arquivado: $arquivo"

      # O modelo que o scorer usa para agrupar vem do arquivo, que o próprio agente escreveu.
      # Quem sabe qual modelo rodou é este script, que passou --model. Divergência aqui agruparia
      # execuções sob um rótulo errado, então ela é reportada em vez de silenciada.
      try {
        $vereditoPath = Join-Path $RunsDir $arquivo
        $modeloNoArquivo = (Get-Content $vereditoPath -Raw | ConvertFrom-Json).model
        if ($modeloNoArquivo -and $modeloNoArquivo -ne $Model) {
          Write-Warn2 "modelo divergente: o arquivo diz '$modeloNoArquivo', a execução foi com '$Model'."
          Write-Warn2 "Corrija o campo antes de pontuar — o scorer agrupa por ele."
        }
      } catch {
        Write-Warn2 "não foi possível conferir o campo 'model' do veredito arquivado."
      }

      # o diretório é o que rotula o braço para o scorer (D-17)
      $destinoDir = if ($IsSmoke) { $SmokeDir } elseif ($armName -eq "sem") { $AblacaoDir } else { $null }

      if ($destinoDir) {
        Move-Item -Path (Join-Path $RunsDir $arquivo) -Destination (Join-Path $destinoDir $arquivo) -Force
        $rotulo = if ($IsSmoke) { "results/runs-smoke/ (fora do alcance do scorer)" }
                  else { "results/runs-ablacao/ (o diretório rotula o braço)" }
        Write-Ok "movido para $rotulo"
      }
    }

    # restaura o veredito "atual", que o POST da ablação sobrescreveu
    foreach ($snap in $snapshots) {
      Copy-Item $snap.backup $snap.path -Force
      Remove-Item $snap.backup -Force
    }
    if ($snapshots.Count -gt 0) {
      Write-Ok "agent-results.json restaurado (a ablação não substitui o braço principal)"
    }

    $manifest += [pscustomobject]@{
      run          = $runIndex
      arm          = $armName
      armDescricao = $(if ($armName -eq "com") { "agente + oráculo MCP" } else { "agente sem oráculo (ablação)" })
      model        = $Model
      mcpConfig    = Split-Path $mcpConfig -Leaf
      prompt       = $prompt
      scope        = $Scope
      archive      = $arquivo
      archiveDir   = $(if ($IsSmoke) { "results/runs-smoke" } elseif ($armName -eq "sem") { "results/runs-ablacao" } else { "results/runs" })
      exitCode     = $exit
      wallClockSeconds = $elapsed
      log          = Split-Path $logFile -Leaf
      startedAt    = $started.ToUniversalTime().ToString("o")
    }

    # Abortar só depois da restauração e do manifesto: parar antes deixaria o agent-results.json
    # sobrescrito pelo POST desta execução e a bateria sem registro do que chegou a rodar.
    if ($limiteAtingido) {
      Write-Warn2 "LIMITE DE GASTO ATINGIDO — bateria interrompida na execução $runIndex de $total."
      Write-Warn2 $motivo
      Write-Warn2 "O que já foi arquivado continua válido. Retome quando o limite liberar;"
      Write-Warn2 "'-Scope smoke' custa ~US$ 0,15 e serve para conferir se já liberou."
      break bateria
    }
  }
}

# ---------------------------------------------------------------- manifesto
$manifestPath = Join-Path $LogsDir "$Stamp-bateria.json"
[pscustomobject]@{
  stamp     = $Stamp
  model     = $Model
  scope     = $Scope
  runsPerArm = $Runs
  arms      = $arms
  corpusUrl = $CorpusUrl
  execucoes = $manifest
} | ConvertTo-Json -Depth 6 | Out-File -FilePath $manifestPath -Encoding utf8

Write-Step "Manifesto da bateria"
Write-Ok $manifestPath

# ---------------------------------------------------------------- baselines
if (-not $SkipBaselines) {
  Write-Step "Baselines determinísticos na mesma sessão (D-06)"
  Push-Location $EvalRoot
  try {
    & npm run axe
    & npm run eslint
  } finally {
    Pop-Location
  }
}

# ---------------------------------------------------------------- pontuação
if (-not $SkipScore) {
  Write-Step "Pontuação (apenas o braço COM oráculo — a ablação precisa de scorer ciente de braço)"
  Push-Location $EvalRoot
  try {
    & npm run score
  } finally {
    Pop-Location
  }
}

Write-Step "Fim"
Write-Host "Execuções com oráculo:  $RunsDir"
Write-Host "Execuções da ablação:   $AblacaoDir"
if ($IsSmoke) { Write-Host "Execuções de fumaça:    $SmokeDir  (não entram em métrica)" }
Write-Host "Logs e manifesto:       $LogsDir"
