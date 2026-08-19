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
  .\run-battery.ps1 -Runs 1 -Arm com
  .\run-battery.ps1 -Runs 3 -Arm ambos
#>

[CmdletBinding()]
param(
  [ValidateRange(1, 10)]
  [int]$Runs = 1,

  [ValidateSet("com", "sem", "ambos")]
  [string]$Arm = "com",

  # Política de modelo (D-17): opus-5 conduz as execuções de avaliação; fable-5 fica para escrita.
  # F3 exige modelo constante dentro de uma bateria — não troque no meio.
  [string]$Model = "claude-opus-5",

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
$LogsDir     = Join-Path $PipelineDir "logs"
$Stamp       = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"

foreach ($d in @($RunsDir, $AblacaoDir, $LogsDir)) {
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
Write-Step "Plano: $total execução(ões) — braços [$($arms -join ', ')] x $Runs, modelo $Model"

$manifest = @()
$runIndex = 0

# ---------------------------------------------------------------- execuções
foreach ($armName in $arms) {
  $mcpConfig = Join-Path $PipelineDir "mcp-$armName-oraculo.json"
  if (-not (Test-Path $mcpConfig)) { throw "Config MCP não encontrada: $mcpConfig" }

  for ($i = 1; $i -le $Runs; $i++) {
    $runIndex++
    Write-Step "[$runIndex/$total] braço '$armName', execução $i"

    $before = @()
    if (Test-Path $RunsDir) {
      $before = Get-ChildItem $RunsDir -Filter "agent-*.json" | Select-Object -ExpandProperty Name
    }

    $logFile = Join-Path $LogsDir "$Stamp-$armName-run$i.json"

    $claudeArgs = @(
      "-p", "/evaluate-all",
      "--strict-mcp-config",
      "--mcp-config", $mcpConfig,
      "--settings", (Join-Path $PipelineDir "settings-run.json"),
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

    # identifica o arquivo arquivado por esta execução
    $after = Get-ChildItem $RunsDir -Filter "agent-*.json" | Select-Object -ExpandProperty Name
    $novo = $after | Where-Object { $before -notcontains $_ }

    if (-not $novo) {
      Write-Warn2 "Nenhum arquivo novo em results/runs/. O agente pode não ter salvado o veredito — confira o log."
      $arquivo = $null
    } else {
      $arquivo = $novo | Select-Object -First 1
      Write-Ok "veredito arquivado: $arquivo"

      # o braço da ablação sai de results/runs/ para não ser agregado pelo scorer
      if ($armName -eq "sem") {
        $origem  = Join-Path $RunsDir $arquivo
        $destino = Join-Path $AblacaoDir $arquivo
        Move-Item -Path $origem -Destination $destino -Force
        Write-Ok "movido para results/runs-ablacao/ (braços nunca são agregados)"
      }
    }

    $manifest += [pscustomobject]@{
      run          = $runIndex
      arm          = $armName
      armDescricao = $(if ($armName -eq "com") { "agente + oráculo MCP" } else { "agente sem oráculo (ablação)" })
      model        = $Model
      mcpConfig    = Split-Path $mcpConfig -Leaf
      archive      = $arquivo
      archiveDir   = $(if ($armName -eq "sem") { "results/runs-ablacao" } else { "results/runs" })
      exitCode     = $exit
      wallClockSeconds = $elapsed
      log          = Split-Path $logFile -Leaf
      startedAt    = $started.ToUniversalTime().ToString("o")
    }
  }
}

# ---------------------------------------------------------------- manifesto
$manifestPath = Join-Path $LogsDir "$Stamp-bateria.json"
[pscustomobject]@{
  stamp     = $Stamp
  model     = $Model
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
Write-Host "Logs e manifesto:       $LogsDir"
