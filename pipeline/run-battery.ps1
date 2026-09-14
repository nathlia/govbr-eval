<#
.SYNOPSIS
  Bateria formal de avaliação (F3/F4) + ablação (F2) para o TCC 2.

.DESCRIPTION
  Executa N sessões headless do agente sobre o corpus, em uma ou nas duas configurações:

    com  = agente + oráculo MCP (govbr-ds-validator) + Playwright
    sem  = agente + Playwright, SEM o oráculo  <- braço da ablação

  Cada execução é um subprocesso novo de Claude Code ou `codex exec --ephemeral`: contexto próprio,
  nenhuma memória da anterior nem de quem disparou o script. É isso que satisfaz o isolamento do
  gabarito (D-01/D-02) sem depender de a pessoa lembrar de abrir uma sessão limpa.

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

  # Mesmo protocolo com o cliente Codex e um modelo OpenAI econômico.
  .\run-battery.ps1 -Provider codex -Model gpt-5.6-luna -Scope smoke -Suite fluxo -Arm ambos
#>

[CmdletBinding()]
param(
  [ValidateRange(1, 10)]
  [int]$Runs = 1,

  [ValidateSet("com", "sem", "ambos")]
  [string]$Arm = "com",

  [ValidateSet("claude", "codex")]
  [string]$Provider = "claude",

  # Política de modelo (D-17): opus-5 conduz as execuções de avaliação; fable-5 fica para escrita.
  # F3 exige modelo constante dentro de uma bateria — não troque no meio.
  # Trocar de modelo é um experimento declarado (sensibilidade a modelo): rode a bateria inteira
  # com -Model outro-modelo. O scorer agrupa por modelo, então a comparação sai separada sozinha.
  [string]$Model = "",

  # Controlado nos dois clientes. Turnos continuam sendo contadores nativos de cada fornecedor e
  # nunca são comparados entre clientes; o esforço, porém, deixa de ficar implícito.
  [ValidateSet("low", "medium", "high", "xhigh", "max")]
  [string]$ReasoningEffort = "high",

  # D-28/Phase 10.6: a superfície do oráculo é uma dimensão experimental, não um pacote opaco.
  # combined mantém compatibilidade; as outras opções isolam a contribuição causal.
  [ValidateSet("combined", "normative", "deterministic", "evidence")]
  [string]$OracleProfile = "combined",

  # full  = corpus inteiro; é o que vale como medida
  # smoke = uma aba só, para conferir encanamento (protocolo, POST, permissões) por ~1/10 do custo.
  #         Execução de fumaça NUNCA é medida: vai para results/runs-smoke/, fora do alcance do scorer.
  [ValidateSet("full", "smoke")]
  [string]$Scope = "full",

  # casos = suite TC-* (ground-truth.json, protocolo evaluate-all)
  # fluxo = suite de fluxo do D-23/D-25 (ground-truth-fluxo.json, protocolo evaluate-fluxo,
  #         unidade ancorada em elemento). As duas suites nunca compartilham diretorio de
  #         execucoes nem entram numa mesma media (D-13).
  [ValidateSet("casos", "fluxo")]
  [string]$Suite = "casos",

  # A aba que o smoke percorre. Qualquer uma serve — o objetivo é exercitar o caminho, não medir.
  [string]$SmokeAba = "Botões",

  [string]$CorpusUrl = "http://localhost:3000",

  [string]$DashboardUrl = "http://localhost:4000",

  [switch]$SkipBaselines,

  [switch]$SkipScore,

  [switch]$PreflightOnly
)

$ErrorActionPreference = "Stop"

$PipelineDir = $PSScriptRoot
$EvalRoot    = Split-Path $PipelineDir -Parent
$TccRoot     = Split-Path $EvalRoot -Parent
$IsFluxo     = $Suite -eq "fluxo"
# D-31: a versão do instrumento vem de instrument.json, a mesma fonte que o scorer lê. Derivá-la
# do gabarito fazia uma correção de gabarito renomear o instrumento e órfãs execuções coletadas
# sob um contrato que não mudou.
$InstrumentVersion = if ($IsFluxo) {
  $instrument = Get-Content -LiteralPath (Join-Path $EvalRoot "instrument.json") -Raw | ConvertFrom-Json
  $instrument.fluxo
} else {
  $caseGt = Get-Content -LiteralPath (Join-Path $EvalRoot "ground-truth.json") -Raw | ConvertFrom-Json
  "casos-$($caseGt._meta.version ?? 'legado')"
}
if ($IsFluxo) {
  $RunsDir    = Join-Path $EvalRoot "results\runs-fluxo"
  $AblacaoDir = Join-Path $EvalRoot "results\runs-fluxo-ablacao"
  $SmokeDir   = Join-Path $EvalRoot "results\runs-fluxo-smoke"
} else {
  $RunsDir    = Join-Path $EvalRoot "results\runs"
  $AblacaoDir = Join-Path $EvalRoot "results\runs-ablacao"
  $SmokeDir   = Join-Path $EvalRoot "results\runs-smoke"
}
$LogsDir     = Join-Path $PipelineDir "logs"
$Stamp       = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"

$IsSmoke = $Scope -eq "smoke"

if (-not $Model) {
  $Model = if ($Provider -eq "codex") { "gpt-5.6-luna" } else { "claude-opus-5" }
}

# Modelo barato por padrão no smoke: ele não mede nada, então não há razão para pagar opus para
# descobrir que o POST funciona. Um -Model explícito continua ganhando.
if ($IsSmoke -and -not $PSBoundParameters.ContainsKey("Model")) {
  $Model = if ($Provider -eq "codex") { "gpt-5.6-luna" } else { "claude-haiku-4-5" }
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

function Set-JsonProperty($object, $name, $value) {
  if ($object.PSObject.Properties[$name]) {
    $object.$name = $value
  } else {
    $object | Add-Member -NotePropertyName $name -NotePropertyValue $value
  }
}

function Find-CodexExecutable {
  $command = Get-Command codex -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $bundledRoot = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\bin"
  if (-not (Test-Path $bundledRoot)) { return $null }
  return Get-ChildItem $bundledRoot -Recurse -Filter codex.exe -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

function ConvertTo-TomlString([string]$value) {
  return '"' + $value.Replace('\', '\\').Replace('"', '\"') + '"'
}

function ConvertTo-TomlArray($values) {
  $items = @()
  foreach ($value in @($values)) {
    $items += ConvertTo-TomlString ([string]$value)
  }
  return '[' + ($items -join ',') + ']'
}

function Get-CodexMcpConfigArgs($mcpConfig) {
  $args = @()
  $playwrightTools = @(
    "browser_navigate", "browser_snapshot", "browser_click", "browser_type", "browser_press_key",
    "browser_evaluate", "browser_take_screenshot", "browser_resize", "browser_console_messages",
    "browser_tab_list", "browser_tab_select"
  )
  $combinedValidatorTools = @(
    "get_ds_rules", "get_design_tokens", "get_emag_rules", "get_page_rules", "get_component_spec",
    "scan_page", "get_finding_details", "verify_finding"
  )

  foreach ($property in $mcpConfig.mcpServers.PSObject.Properties) {
    $name = $property.Name
    $server = $property.Value
    $prefix = "mcp_servers.$name"
    $args += @("-c", "$prefix.command=$(ConvertTo-TomlString ([string]$server.command))")
    if ($server.args) { $args += @("-c", "$prefix.args=$(ConvertTo-TomlArray @($server.args))") }
    if ($server.env) {
      $pairs = @($server.env.PSObject.Properties | ForEach-Object {
        $_.Name + '=' + (ConvertTo-TomlString ([string]$_.Value))
      })
      $args += @("-c", "$prefix.env={$($pairs -join ',')}")
    }
    $enabledTools = if ($name -eq "playwright") {
      $playwrightTools
    } else {
      $profile = [string]($server.env.GOVBR_VALIDATOR_TOOL_PROFILE ?? "evaluation")
      switch ($profile) {
        "normative" { @("get_ds_rules", "get_design_tokens", "get_emag_rules", "get_page_rules", "get_component_spec") }
        "deterministic" { @("scan_page", "get_finding_details") }
        "evidence" { @("inspect_computed_styles") }
        default { $combinedValidatorTools }
      }
    }
    $args += @("-c", "$prefix.enabled_tools=$(ConvertTo-TomlArray $enabledTools)")
    $args += @("-c", "$prefix.required=true")
    $args += @("-c", "$prefix.startup_timeout_sec=30")
    $args += @("-c", "$prefix.tool_timeout_sec=120")
    $args += @("-c", "$prefix.default_tools_approval_mode=`"approve`"")
  }
  return $args
}

function Get-CodexLogSummary($path) {
  $events = @(Get-Content -LiteralPath $path | Where-Object { $_.Trim() } | ForEach-Object {
    try { $_ | ConvertFrom-Json } catch { }
  })
  $turns = @($events | Where-Object { $_.type -eq "turn.completed" })
  $lastTurn = $turns | Select-Object -Last 1
  $failed = $events | Where-Object { $_.type -in @("turn.failed", "error") } | Select-Object -Last 1
  $items = @($events | Where-Object { $_.type -eq "item.completed" })
  $mcpCalls = @($items | Where-Object { $_.item.type -eq "mcp_tool_call" }).Count
  $usage = $lastTurn.usage
  $cached = [int64]($usage.cached_input_tokens ?? 0)
  $input = [int64]($usage.input_tokens ?? 0)

  return [pscustomobject]@{
    usage = [pscustomobject]@{
      input_tokens = [math]::Max(0, $input - $cached)
      cache_creation_input_tokens = 0
      cache_read_input_tokens = $cached
      output_tokens = [int64]($usage.output_tokens ?? 0)
      reasoning_output_tokens = [int64]($usage.reasoning_output_tokens ?? 0)
    }
    num_turns = $turns.Count
    tool_calls = $mcpCalls
    total_cost_usd = $null
    api_error_status = if (([string]$failed.message) -match '429|rate.?limit|usage.?limit') { 429 } else { $null }
    result = [string]($failed.message ?? "")
  }
}

function Get-McpTelemetrySummary($path, $runId) {
  $events = @()
  if (Test-Path $path) {
    $events = @(Get-Content -LiteralPath $path | Where-Object { $_.Trim() } | ForEach-Object {
      try { $_ | ConvertFrom-Json } catch { }
    })
  }

  $byTool = [ordered]@{}
  foreach ($event in $events) {
    $name = [string]$event.tool
    if (-not $byTool.Contains($name)) {
      $byTool[$name] = [ordered]@{ calls = 0; errors = 0; cacheHits = 0; requestBytes = 0; responseBytes = 0; durationMs = 0 }
    }
    $item = $byTool[$name]
    $item.calls++
    if ($event.status -eq "error") { $item.errors++ }
    if ($event.cacheHit -eq $true) { $item.cacheHits++ }
    $item.requestBytes += [int64]($event.requestBytes ?? 0)
    $item.responseBytes += [int64]($event.responseBytes ?? 0)
    $item.durationMs += [int64]($event.durationMs ?? 0)
  }

  $rankedByTool = [ordered]@{}
  foreach ($entry in ($byTool.GetEnumerator() | Sort-Object { $_.Value.responseBytes } -Descending)) {
    $rankedByTool[$entry.Key] = $entry.Value
  }

  return [ordered]@{
    runId = $runId
    telemetryFile = if (Test-Path $path) { "pipeline/logs/$(Split-Path $path -Leaf)" } else { $null }
    calls = $events.Count
    errors = @($events | Where-Object { $_.status -eq "error" }).Count
    cacheHits = @($events | Where-Object { $_.cacheHit -eq $true }).Count
    requestBytes = [int64](($events | Measure-Object -Property requestBytes -Sum).Sum ?? 0)
    responseBytes = [int64](($events | Measure-Object -Property responseBytes -Sum).Sum ?? 0)
    durationMs = [int64](($events | Measure-Object -Property durationMs -Sum).Sum ?? 0)
    byTool = $rankedByTool
  }
}

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

$clientName = "$Provider-cli"
$clientExecutable = $null
$clientVersion = "unknown"
if ($Provider -eq "claude") {
  $claudeCommand = Get-Command claude -ErrorAction SilentlyContinue
  if (-not $claudeCommand) { throw "CLI 'claude' não encontrada no PATH." }
  $clientExecutable = $claudeCommand.Source
  $clientVersion = (& $clientExecutable --version 2>$null | Select-Object -First 1).Trim()
} else {
  $clientExecutable = Find-CodexExecutable
  if (-not $clientExecutable) {
    throw "Codex CLI não encontrada no PATH nem no pacote do app desktop."
  }
  $clientVersion = (& $clientExecutable --version 2>$null | Select-Object -First 1).Trim()
  $loginStatus = (& $clientExecutable login status 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "Codex CLI não autenticada. Rode '& '$clientExecutable' login --device-auth' no seu PowerShell. Status: $loginStatus"
  }
}
if (-not $clientVersion) { $clientVersion = "unknown" }
Write-Ok "Cliente $clientName encontrado ($clientVersion)"

# A6: o protocolo carrega procedimento apenas. Se conhecimento de domínio vazar para dentro dele,
# o protocolo vira um segundo oráculo e a ablação deixa de medir o que se propõe a medir — então
# a bateria inteira sai inválida. Barrar aqui é mais barato que descobrir depois de gastar as
# execuções. Ver docs/ablation-design.md e o cabeçalho de skills/evaluate-all/SKILL.md.
Push-Location $EvalRoot
try {
  & npm run lint:protocol --silent
  $lintExit = $LASTEXITCODE
  if ($lintExit -eq 0) {
    & npm run lint:skills --silent
    $lintExit = $LASTEXITCODE
  }
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

$validatorPackage = Get-Content (Join-Path $TccRoot "govbr-ds-validator\package.json") -Raw | ConvertFrom-Json
$validatorVersion = [string]$validatorPackage.version
$protocolPath = if ($IsFluxo) {
  Join-Path $EvalRoot "skills\evaluate-screen\SKILL.md"
} else {
  Join-Path $EvalRoot "skills\evaluate-all\SKILL.md"
}
$sharedProtocolPath = Join-Path $EvalRoot "skills\_shared\evaluation-protocol.md"
$protocolText = (Get-Content -LiteralPath $sharedProtocolPath -Raw) + "`n--- specialization ---`n" +
  (Get-Content -LiteralPath $protocolPath -Raw)
$protocolHasher = [System.Security.Cryptography.SHA256]::Create()
try {
  $protocolBytes = [System.Text.Encoding]::UTF8.GetBytes($protocolText)
  $protocolHash = [System.BitConverter]::ToString($protocolHasher.ComputeHash($protocolBytes)).Replace("-", "").ToLowerInvariant()
} finally {
  $protocolHasher.Dispose()
}
$protocolVersion = "sha256:" + $protocolHash
Write-Ok "Protocolo $protocolVersion"

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
Write-Step "Plano: $total execução(ões) — cliente $clientName, braços [$($arms -join ', ')] x $Runs, modelo $Model, esforço $ReasoningEffort, oráculo $OracleProfile, escopo $Scope"

if ($IsSmoke) {
  $recorte = if ($IsFluxo) { "a tela de fluxo inteira, com modelo barato" } else { "só a aba '$SmokeAba'" }
  Write-Warn2 "ESCOPO SMOKE: $recorte. Nao e medida — os resultados vao para"
  Write-Warn2 "results/$(Split-Path $SmokeDir -Leaf)/, que o scorer nao le, e baselines/pontuacao estao desligados."
}

if ($PreflightOnly) {
  Write-Step "Preflight concluido"
  Write-Ok "Nenhum modelo foi chamado."
  return
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
    if ((-not $IsFluxo) -and ($armName -eq "sem" -or $IsSmoke)) {
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

    $logExtension = if ($Provider -eq "codex") { "jsonl" } else { "json" }
    $logFile      = Join-Path $LogsDir "$Stamp-$armName-run$i.$logExtension"
    $stderrFile   = Join-Path $LogsDir "$Stamp-$armName-run$i.stderr.log"
    $settingsFile = Join-Path $PipelineDir "settings-run.json"
    $runId        = "$Stamp-$armName-run$i-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
    $telemetryFile = Join-Path $LogsDir "$runId-mcp.ndjson"
    $runMcp = Get-Content -LiteralPath $mcpConfig -Raw | ConvertFrom-Json
    $effectiveMcpConfig = $mcpConfig
    if ($armName -eq "com") {
      # Grava os identificadores explicitamente na configuração do subprocesso MCP. Não depende
      # de o cliente preservar variáveis herdadas quando também existe um bloco `env` no JSON.
      $validatorMcp = $runMcp.mcpServers."govbr-ds-validator"
      Set-JsonProperty $validatorMcp.env "GOVBR_VALIDATOR_RUN_ID" $runId
      Set-JsonProperty $validatorMcp.env "GOVBR_VALIDATOR_TELEMETRY_FILE" $telemetryFile
      $validatorToolProfile = if ($OracleProfile -eq "combined") { "evaluation" } else { $OracleProfile }
      Set-JsonProperty $validatorMcp.env "GOVBR_VALIDATOR_TOOL_PROFILE" $validatorToolProfile
      $effectiveMcpConfig = Join-Path $LogsDir "$runId-mcp-config.json"
      $runMcp | ConvertTo-Json -Depth 10 | Out-File -LiteralPath $effectiveMcpConfig -Encoding utf8
    }
    $codexMcpArgs = if ($Provider -eq "codex") { @(Get-CodexMcpConfigArgs $runMcp) } else { @() }

    # O recorte do smoke vive aqui, no disparo — não dentro do protocolo. O protocolo é o mesmo
    # arquivo nos dois escopos, senão a execução de fumaça deixaria de exercitar o que vai rodar
    # de verdade. A frase abaixo restringe o percurso e nada mais; não diz nada sobre o domínio.
    # A suite de fluxo e uma tela so: nao ha recorte de aba a fazer, entao o smoke dela difere do
    # full apenas no modelo barato e no diretorio fora do alcance do scorer.
    # O protocolo geral nao sabe nada sobre a tela: alvo e destino do POST chegam AQUI, na
    # invocacao, identicos nos dois bracos. E o que permite o mesmo arquivo servir a qualquer tela.
    $invocation = if ($IsFluxo) {
      "Avalie a tela em $CorpusUrl/fluxo.html. " +
      "Para salvar, navegue ate $DashboardUrl e faca POST em /api/save-flow-results a partir dali."
    } elseif ($IsSmoke) {
      "Percorra apenas a aba '$SmokeAba' e feche os vereditos só dos casos dela. " +
      "Ignore as demais abas e as rotas estáticas."
    } else {
      "Avalie o corpus completo em $CorpusUrl e salve no endpoint definido pelo protocolo."
    }

    # D-36: os dois clientes recebem o protocolo do mesmo jeito — o texto no prompt, idêntico ao que
    # entra no hash. O Claude Code lia /evaluate-screen partindo de F:\Dev Nath\TCC e, com isso,
    # herdava a raiz do TCC: arquivos gravados ali por execuções anteriores (inclusive do outro
    # braço), additionalDirectories das configurações do usuário e WebSearch/WebFetch liberados no
    # settings.local.json do projeto.
    $prompt = $protocolText + "`n`n--- INVOCACAO DESTA EXECUCAO ---`n" + $invocation

    # Raiz descartável por execução, nos dois clientes. O Playwright MCP grava snapshots e arquivos
    # de browser_evaluate no diretório de trabalho, então nada que uma execução escreve alcança a
    # seguinte nem o outro braço.
    $isolatedRoot = Join-Path ([System.IO.Path]::GetTempPath()) "govbr-eval-$runId"
    New-Item -ItemType Directory -Path $isolatedRoot -Force | Out-Null

    # --restricted ignora settings de usuário, projeto e local (só --settings vale), confina as
    # ferramentas de arquivo ao diretório de trabalho e remove shell e WebFetch. A transcrição da
    # sessão continua gravada: é a única trilha das chamadas de ferramenta (ex.: browser_resize).
    $claudeArgs = @(
      "-p", $prompt,
      "--restricted",
      "--strict-mcp-config",
      "--mcp-config", $effectiveMcpConfig,
      "--settings", $settingsFile,
      "--model", $Model,
      "--effort", $ReasoningEffort,
      "--output-format", "json",
      "--permission-mode", "dontAsk"
    )

    $clientArgs = $claudeArgs
    if ($Provider -eq "codex") {
      $clientArgs = @(
        "exec", "--ephemeral", "--json", "--ignore-user-config", "--ignore-rules",
        "--skip-git-repo-check", "--sandbox", "read-only", "--color", "never",
        "-C", $isolatedRoot, "-m", $Model,
        "-c", "model_reasoning_effort=`"$ReasoningEffort`"",
        "-c", 'approval_policy="never"',
        "-c", 'features.shell_tool=false',
        "-c", 'agents.enabled=false',
        "-c", 'web_search="disabled"'
      ) + $codexMcpArgs + @($prompt)
    }

    Push-Location $isolatedRoot
    $previousValidatorRunId = $env:GOVBR_VALIDATOR_RUN_ID
    $previousTelemetryFile = $env:GOVBR_VALIDATOR_TELEMETRY_FILE
    try {
      $env:GOVBR_VALIDATOR_RUN_ID = $runId
      $env:GOVBR_VALIDATOR_TELEMETRY_FILE = $telemetryFile
      $started = Get-Date
      & $clientExecutable @clientArgs 2> $stderrFile | Out-File -FilePath $logFile -Encoding utf8
      $exit = $LASTEXITCODE
      $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)
    } finally {
      if ($null -eq $previousValidatorRunId) { Remove-Item Env:GOVBR_VALIDATOR_RUN_ID -ErrorAction SilentlyContinue }
      else { $env:GOVBR_VALIDATOR_RUN_ID = $previousValidatorRunId }
      if ($null -eq $previousTelemetryFile) { Remove-Item Env:GOVBR_VALIDATOR_TELEMETRY_FILE -ErrorAction SilentlyContinue }
      else { $env:GOVBR_VALIDATOR_TELEMETRY_FILE = $previousTelemetryFile }
      Pop-Location
      if ($isolatedRoot) {
        $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        $resolvedIsolated = [System.IO.Path]::GetFullPath($isolatedRoot)
        if ($resolvedIsolated.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase)) {
          Remove-Item -LiteralPath $resolvedIsolated -Recurse -Force -ErrorAction SilentlyContinue
        }
      }
    }

    if ($exit -ne 0) {
      Write-Warn2 "$clientName saiu com código $exit. Log: $logFile"
    } else {
      Write-Ok "concluída em ${elapsed}s — log: $logFile"
    }

    # Limite de gasto atingido: as execuções restantes falhariam em sequência, cada uma gravando
    # um log vazio e empurrando a bateria para um estado meio-feito. Já aconteceu duas vezes
    # (19/08 e 27/08). Parar aqui preserva o que foi arquivado até agora e deixa o motivo visível.
    $limiteAtingido = $false
    $logJson = $null
    try {
      $logJson = if ($Provider -eq "codex") {
        Get-CodexLogSummary $logFile
      } else {
        Get-Content $logFile -Raw | ConvertFrom-Json
      }
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
          Write-Warn2 "O runner normalizará o campo e preservará o rótulo do agente em config.agentReportedModel."
        }
      } catch {
        Write-Warn2 "não foi possível conferir o campo 'model' do veredito arquivado."
      }

      # o diretório é o que rotula o braço para o scorer (D-17)
      $destinoDir = if ($IsSmoke) { $SmokeDir } elseif ($armName -eq "sem") { $AblacaoDir } else { $null }

      if ($destinoDir) {
        Move-Item -Path (Join-Path $RunsDir $arquivo) -Destination (Join-Path $destinoDir $arquivo) -Force
        $rotulo = "$(Split-Path $destinoDir -Leaf)/ " + $(if ($IsSmoke) { "(fora do alcance do scorer)" } else { "(o diretorio rotula o braco)" })
        Write-Ok "movido para $rotulo"
      }

      # O runner, não o agente, conhece a configuração real e recebe os contadores do cliente.
      # Enriquece somente o artefato arquivado, depois que o processo terminou. Isso tira trabalho
      # contábil do prompt e impede que estimativas do modelo virem dados experimentais.
      $arquivoDir = if ($destinoDir) { $destinoDir } else { $RunsDir }
      $arquivoPath = Join-Path $arquivoDir $arquivo
      try {
        $veredito = Get-Content -LiteralPath $arquivoPath -Raw | ConvertFrom-Json
        if (-not $veredito.config) {
          $veredito | Add-Member -NotePropertyName config -NotePropertyValue ([pscustomobject]@{})
        }
        $modeloDeclarado = [string]$veredito.model
        if ($modeloDeclarado -and $modeloDeclarado -ne $Model) {
          Set-JsonProperty $veredito.config "agentReportedModel" $modeloDeclarado
        }
        Set-JsonProperty $veredito "model" $Model
        Set-JsonProperty $veredito.config "arm" $(if ($armName -eq "com") { "com-oraculo" } else { "sem-oraculo" })
        Set-JsonProperty $veredito.config "client" $clientName
        Set-JsonProperty $veredito.config "clientVersion" $clientVersion
        Set-JsonProperty $veredito.config "modelVersion" $Model
        Set-JsonProperty $veredito.config "reasoningEffort" $ReasoningEffort
        Set-JsonProperty $veredito.config "oracleProfile" $(if ($armName -eq "com") { $OracleProfile } else { "none" })
        Set-JsonProperty $veredito.config "turnMetric" "$clientName-native (não comparável entre clientes)"
        Set-JsonProperty $veredito.config "protocolVersion" $protocolVersion
        Set-JsonProperty $veredito.config "instrumentVersion" $InstrumentVersion
        if ($armName -eq "com") {
          Set-JsonProperty $veredito.config "validatorVersion" $validatorVersion
        }

        $finishedAt = Get-Date
        if (-not $veredito.cost) {
          $veredito | Add-Member -NotePropertyName cost -NotePropertyValue ([pscustomobject]@{})
        }
        Set-JsonProperty $veredito.cost "startedAt" $started.ToUniversalTime().ToString("o")
        Set-JsonProperty $veredito.cost "finishedAt" $finishedAt.ToUniversalTime().ToString("o")
        Set-JsonProperty $veredito.cost "wallClockSeconds" $elapsed

        if ($logJson) {
          $tokenUsage = [ordered]@{
            input = [int64]($logJson.usage.input_tokens ?? 0)
            cacheCreationInput = [int64]($logJson.usage.cache_creation_input_tokens ?? 0)
            cacheReadInput = [int64]($logJson.usage.cache_read_input_tokens ?? 0)
            output = [int64]($logJson.usage.output_tokens ?? 0)
          }
          $totalTokens = $tokenUsage.input + $tokenUsage.cacheCreationInput + $tokenUsage.cacheReadInput + $tokenUsage.output
          Set-JsonProperty $veredito.cost "tokens" $totalTokens
          Set-JsonProperty $veredito.cost "tokenUsage" $tokenUsage
          if ($null -ne $logJson.total_cost_usd) {
            Set-JsonProperty $veredito.cost "totalCostUsd" ([double]$logJson.total_cost_usd)
          }
          Set-JsonProperty $veredito.cost "turns" ([int]($logJson.num_turns ?? 0))
          if ($null -ne $logJson.tool_calls) {
            Set-JsonProperty $veredito.cost "toolCalls" ([int]$logJson.tool_calls)
          }
          if ($null -ne $logJson.usage.reasoning_output_tokens) {
            Set-JsonProperty $veredito.cost "reasoningOutputTokens" ([int64]$logJson.usage.reasoning_output_tokens)
          }
        }

        if ($armName -eq "com") {
          $mcpSummary = Get-McpTelemetrySummary $telemetryFile $runId
          Set-JsonProperty $veredito.cost "mcp" $mcpSummary
          Write-Ok "telemetria MCP: $($mcpSummary.calls) chamadas, $($mcpSummary.responseBytes) bytes de resposta"
        }

        $veredito | ConvertTo-Json -Depth 30 | Out-File -LiteralPath $arquivoPath -Encoding utf8
        Write-Ok "metadados de configuração e custo anexados pelo runner"
      } catch {
        Write-Warn2 "não foi possível enriquecer o veredito arquivado: $($_.Exception.Message)"
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
      runId        = $runId
      arm          = $armName
      armDescricao = $(if ($armName -eq "com") { "agente + oráculo MCP" } else { "agente sem oráculo (ablação)" })
      model        = $Model
      reasoningEffort = $ReasoningEffort
      oracleProfile = $(if ($armName -eq "com") { $OracleProfile } else { "none" })
      client       = $clientName
      clientVersion = $clientVersion
      protocolVersion = $protocolVersion
      instrumentVersion = $InstrumentVersion
      validatorVersion = $(if ($armName -eq "com") { $validatorVersion } else { $null })
      mcpConfig    = Split-Path $effectiveMcpConfig -Leaf
      prompt       = $invocation
      scope        = $Scope
      archive      = $arquivo
      suite        = $Suite
      archiveDir   = "results/" + $(if ($IsSmoke) { Split-Path $SmokeDir -Leaf } elseif ($armName -eq "sem") { Split-Path $AblacaoDir -Leaf } else { Split-Path $RunsDir -Leaf })
      exitCode     = $exit
      wallClockSeconds = $elapsed
      log          = Split-Path $logFile -Leaf
      stderrLog    = Split-Path $stderrFile -Leaf
      mcpTelemetry = $(if (Test-Path $telemetryFile) { Split-Path $telemetryFile -Leaf } else { $null })
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
  reasoningEffort = $ReasoningEffort
  oracleProfile = $OracleProfile
  client    = $clientName
  clientVersion = $clientVersion
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
  if ($IsFluxo) {
    # As linhas de base da suite TC-* nao valem para a tela de fluxo: sao outra pagina, e mistura-las
    # e exatamente o que o D-13 proibe. O runner da suite de fluxo atribui por chave de elemento e
    # prepara a pagina no mesmo estado que o scorer usa.
    Write-Step "Baselines deterministicos da suite de fluxo, na mesma sessao (D-06)"
    Push-Location $EvalRoot
    try {
      & npm run baselines:fluxo
    } finally {
      Pop-Location
    }
  } else {
    Write-Step "Baselines determinísticos na mesma sessão (D-06)"
    Push-Location $EvalRoot
    try {
      & npm run axe
      & npm run eslint
    } finally {
      Pop-Location
    }
  }
}

# ---------------------------------------------------------------- pontuação
if (-not $SkipScore) {
  Write-Step "Pontuacao"
  Push-Location $EvalRoot
  try {
    if ($IsFluxo) { & npm run score:fluxo } else { & npm run score }
  } finally {
    Pop-Location
  }
}

Write-Step "Fim"
Write-Host "Execuções com oráculo:  $RunsDir"
Write-Host "Execuções da ablação:   $AblacaoDir"
if ($IsSmoke) { Write-Host "Execuções de fumaça:    $SmokeDir  (não entram em métrica)" }
Write-Host "Logs e manifesto:       $LogsDir"
