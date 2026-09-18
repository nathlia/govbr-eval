$ErrorActionPreference = "Stop"

$runner = Join-Path $PSScriptRoot "run-battery.ps1"
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($runner, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw "run-battery.ps1 has syntax errors." }

$wanted = @("ConvertTo-TomlString", "ConvertTo-TomlArray", "Get-CodexMcpConfigArgs", "Get-CodexLogSummary", "Save-RunEvidence", "Complete-RunEvidence",
  "Write-NewJson", "Get-Sha256", "New-BatterySlots")
$definitions = $ast.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $wanted -contains $node.Name
}, $true)
foreach ($definition in $definitions) { Invoke-Expression $definition.Extent.Text }
if ($definitions.Count -ne $wanted.Count) { throw "Expected support functions were not found." }

$runnerText = Get-Content -LiteralPath $runner -Raw
foreach ($contract in @(
  'Set-JsonProperty $veredito "model" $Model',
  'Set-JsonProperty $veredito.config "agentReportedModel" $modeloDeclarado',
  'Set-JsonProperty $veredito.config "reasoningEffort" $ReasoningEffort',
  'Set-JsonProperty $veredito.config "instrumentVersion" $InstrumentVersion',
  'model_reasoning_effort=',
  '"--effort", $ReasoningEffort',
  # D-36: isolamento da execução — raiz descartável, modo restrito, protocolo no prompt.
  '"--restricted"',
  'Push-Location $isolatedRoot',
  '$prompt = $protocolText + ',
  # fluxo-1.3.0: a evidência da raiz descartável é copiada antes da limpeza e registrada.
  '$evidenceSummary = Save-RunEvidence',
  '"evidenceDir" $evidenceSummary.dir',
  'evidence     = $evidenceSummary'
)) {
  if (-not $runnerText.Contains($contract)) { throw "Missing runner metadata contract: $contract" }
}
if ($runnerText.Contains('$TccRoot })')) {
  throw "A run must never start from the TCC root (D-36): files from earlier runs are readable there."
}

$settings = Get-Content -LiteralPath (Join-Path $PSScriptRoot "settings-run.json") -Raw | ConvertFrom-Json
if ($settings.permissions.allow -notcontains "mcp__playwright__browser_resize") {
  throw "The scored-run permission set must allow browser_resize when the protocol measures reflow."
}
foreach ($denied in @(
  "WebSearch", "WebFetch", "Bash", "PowerShell", "Read(//f/Dev Nath/TCC/**)",
  # Nome nu retira a ferramenta do contexto: o Claude vê a mesma superfície Playwright que o Codex.
  "mcp__playwright__browser_run_code", "mcp__playwright__browser_fill_form"
)) {
  if ($settings.permissions.deny -notcontains $denied) { throw "The scored-run permission set must deny $denied (D-36)." }
}
foreach ($rule in @($settings.permissions.allow) + @($settings.permissions.deny)) {
  if ($rule -match '^Read\((?!//|~/)') {
    throw "Relative Read rule '$rule' anchors at the temporary run root and protects nothing (D-36)."
  }
}

# v02, fatia 1 (D-40): a execução só alcança a tela congelada e o coletor, pelo proxy da superfície.
foreach ($contract in @(
  '& npm run test:isolation',
  '/control/arm',
  '/control/disarm',
  '$env:APP_URL = $surface.origins.site',
  'Stop-Surface'
)) {
  if (-not $runnerText.Contains($contract)) { throw "Missing measurement-surface contract: $contract" }
}
if ($runnerText -cmatch '\$DashboardUrl|api/save-flow-results') {
  throw "A measured run must not save through the dashboard (D-40)."
}
# O 429 é causa, não sintoma: a execução morta pelo limite também não entrega relatório, e o teste
# de `sem-relatorio` posto antes gravava falha do coletor no lugar do limite — foi o que aconteceu
# nas paradas de 17/09 e 18/09. O desfecho e o diário são a única memória do motivo.
$posLimite = $runnerText.IndexOf('if ($limiteAtingido) {')
$posSemRelatorio = $runnerText.IndexOf('if ($collectionStatus -eq "sem-relatorio") {')
if ($posLimite -lt 0 -or $posSemRelatorio -lt 0) { throw "Missing stop-reason branches for spend limit / missing report." }
if ($posLimite -gt $posSemRelatorio) {
  throw "The spend-limit branch must be tested before 'sem-relatorio', or a 429 is recorded as a collector failure."
}
if (-not $runnerText.Contains('apiErrorStatus = $apiErrorStatus')) {
  throw "The battery manifest and journal must record the client's api_error_status per slot."
}

$armConfigs = foreach ($file in @("mcp-com-oraculo.json", "mcp-sem-oraculo.json")) {
  (Get-Content -LiteralPath (Join-Path $PSScriptRoot $file) -Raw | ConvertFrom-Json).mcpServers
}
if (($armConfigs[0].playwright | ConvertTo-Json -Compress -Depth 5) -ne ($armConfigs[1].playwright | ConvertTo-Json -Compress -Depth 5)) {
  throw "Both arms must receive the identical Playwright MCP block (D-16/D-40)."
}
if (($armConfigs[0].playwright.args -join " ") -notmatch '--proxy-server http://127\.0\.0\.1:4102') {
  throw "Playwright MCP must go through the measurement-surface proxy (D-40)."
}
if ($armConfigs[0]."govbr-ds-validator".env.GOVBR_VALIDATOR_PROXY_SERVER -ne "http://127.0.0.1:4102") {
  throw "The oracle's browser must go through the same proxy (D-40)."
}

$config = [pscustomobject]@{
  mcpServers = [pscustomobject]@{
    playwright = [pscustomobject]@{ command = "cmd"; args = @("/c", "npx", "pkg"); env = [pscustomobject]@{} }
    "govbr-ds-validator" = [pscustomobject]@{
      command = "C:/node.exe"
      args = @("C:/validator.js")
      env = [pscustomobject]@{ GOVBR_VALIDATOR_RUN_ID = "run-1"; GOVBR_VALIDATOR_TOOL_PROFILE = "normative" }
    }
  }
}
$configArgs = @(Get-CodexMcpConfigArgs $config)
$joined = $configArgs -join "`n"
foreach ($expected in @(
  'mcp_servers.playwright.command="cmd"',
  'mcp_servers.playwright.enabled_tools=',
  'browser_resize',
  'mcp_servers.govbr-ds-validator.env={GOVBR_VALIDATOR_RUN_ID="run-1",GOVBR_VALIDATOR_TOOL_PROFILE="normative"}',
  'mcp_servers.govbr-ds-validator.enabled_tools=["get_ds_rules","get_design_tokens","get_emag_rules","get_page_rules","get_component_spec"]',
  'mcp_servers.govbr-ds-validator.required=true'
)) {
  if (-not $joined.Contains($expected)) { throw "Missing Codex config: $expected" }
}

$fixture = Join-Path ([System.IO.Path]::GetTempPath()) "codex-events-$([guid]::NewGuid().ToString('N')).jsonl"
try {
  [System.IO.File]::WriteAllLines($fixture, @(
    '{"type":"item.completed","item":{"type":"mcp_tool_call"}}',
    '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":40,"output_tokens":20,"reasoning_output_tokens":5}}'
  ))
  $summary = Get-CodexLogSummary $fixture
  if ($summary.usage.input_tokens -ne 60) { throw "Incorrect normalized Codex input tokens." }
  if ($summary.usage.cache_read_input_tokens -ne 40) { throw "Incorrect Codex cache tokens." }
  if ($summary.usage.output_tokens -ne 20) { throw "Incorrect Codex output tokens." }
  if ($summary.tool_calls -ne 1) { throw "Incorrect Codex MCP call count." }
} finally {
  Remove-Item -LiteralPath $fixture -Force -ErrorAction SilentlyContinue
}

# fluxo-1.3.0: o que a execução gravou na raiz descartável sobrevive à limpeza, com índice sha256.
$evidenceRoot = Join-Path ([System.IO.Path]::GetTempPath()) "govbr-evidence-test-$([guid]::NewGuid().ToString('N'))"
try {
  $source = Join-Path $evidenceRoot "raiz"
  New-Item -ItemType Directory -Force -Path (Join-Path $source ".playwright-mcp") | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $source ".playwright-mcp/page-1.yml"), "- button Continuar")
  [System.IO.File]::WriteAllBytes((Join-Path $source "shot.png"), [byte[]](1, 2, 3))
  $summary = Save-RunEvidence -Source $source -Destination (Join-Path $evidenceRoot "logs/run-1-evidencia") -RelativeTo $evidenceRoot -RunId "run-1"
  if ($summary.files -ne 2 -or $summary.bytes -le 0) { throw "Evidence copy must keep every file the run wrote." }
  if ($summary.dir -ne "logs/run-1-evidencia") { throw "Evidence dir must be relative to the eval root: $($summary.dir)" }
  $index = Get-Content -LiteralPath (Join-Path $evidenceRoot "logs/run-1-evidencia/evidence-index.json") -Raw | ConvertFrom-Json
  $page = @($index.files) | Where-Object { $_.path -eq ".playwright-mcp/page-1.yml" }
  $expectedHash = (Get-FileHash -LiteralPath (Join-Path $source ".playwright-mcp/page-1.yml") -Algorithm SHA256).Hash.ToLowerInvariant()
  if (-not $page -or $page.sha256 -ne $expectedHash) { throw "Evidence index must carry the sha256 of each preserved file." }
  if (-not (Test-Path (Join-Path $evidenceRoot "logs/run-1-evidencia/shot.png"))) { throw "Screenshots must be preserved." }
  $empty = Save-RunEvidence -Source (Join-Path $evidenceRoot "vazia") -Destination (Join-Path $evidenceRoot "logs/run-2-evidencia") -RelativeTo $evidenceRoot -RunId "run-2"
  if ($empty.files -ne 0 -or -not (Test-Path (Join-Path $evidenceRoot "logs/run-2-evidencia/evidence-index.json"))) {
    throw "A run without evidence still gets an explicit, empty index."
  }
  # A failure after the first copied file must keep the entire source for recovery.
  $failedSource = Join-Path $evidenceRoot "failure-source"
  $failedDestination = Join-Path $evidenceRoot "logs/failure"
  New-Item -ItemType Directory -Force -Path $failedSource,$failedDestination | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $failedSource "a.txt"), "copied before failure")
  New-Item -ItemType Directory -Force -Path (Join-Path $failedSource "nested") | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $failedSource "nested/b.txt"), "must survive")
  [System.IO.File]::WriteAllText((Join-Path $failedDestination "nested"), "blocks the second destination directory")
  $failed = Complete-RunEvidence -Source $failedSource -Destination $failedDestination -RelativeTo $evidenceRoot -RunId "failed"
  if ($failed.status -ne "failed" -or -not $failed.error -or -not $failed.recoverySource) { throw "Failure needs structured recovery metadata." }
  if (-not (Test-Path (Join-Path $failedDestination "a.txt"))) { throw "Fixture must fail after a partial copy." }
  if (-not (Test-Path (Join-Path $failedSource "nested/b.txt"))) { throw "Never delete source evidence after a partial copy failure." }
  $successSource = Join-Path $evidenceRoot "success-source"
  New-Item -ItemType Directory -Force -Path $successSource | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $successSource "ok.txt"), "preserve then clean")
  $preserved = Complete-RunEvidence -Source $successSource -Destination (Join-Path $evidenceRoot "logs/success") -RelativeTo $evidenceRoot -RunId "success"
  if ($preserved.status -ne "preserved" -or (Test-Path $successSource)) { throw "Successful verified copy should clean its temporary source." }
} finally {
  if (Test-Path -LiteralPath $evidenceRoot) { Remove-Item -LiteralPath $evidenceRoot -Recurse -Force }
}

# surface-1.2.0: sem relatório aceito, a última recusa vira o relatório da execução — nunca em silêncio.
foreach ($contract in @(
  '$submission.receipt.status -eq "recusa-arquivada"',
  'Set-JsonProperty $veredito.config "submissionStatus" $submission.receipt.status',
  'Set-JsonProperty $veredito.config "refusedSubmission"',
  'promotedFrom = ',
  'Write-Warn2 "NENHUM relatório desta execução passou no contrato'
)) {
  if (-not $runnerText.Contains($contract)) { throw "Missing refused-report contract: $contract" }
}

# Fatia 6: identidade da coleta, agenda congelada, linha de base e pacote presos à bateria.
foreach ($contract in @(
  'Push-Location (Join-Path $TccRoot "govbr-ds-validator")',
  '"scripts/collection-manifest.ts", "build"',
  '"--oracle-built"',
  '$identityIntact = Test-CollectionIdentity',
  'Set-JsonProperty $veredito.config "collectionManifestSha256" $CollectionManifestSha',
  'collectionManifestSha256 = $CollectionManifestSha',
  ':bateria foreach ($slot in $planSlots)',
  'collectionStatus = "nao-tentada"',
  '--out $BaselinePath --collection-manifest $CollectionManifestPath --site-manifest $SiteManifestPath',
  '"--collection-manifest", $CollectionManifestPath, "--site-dir", $SurfaceDir',
  'Write-NewJson -Path (Join-Path $LogsDir "$Stamp-desfecho.json")'
)) {
  if (-not $runnerText.Contains($contract)) { throw "Missing slice-6 contract: $contract" }
}
if ($runnerText.Contains('--app-url')) { throw "Preparation must serve the frozen site itself, never a URL (slice 6)." }
if ($runnerText -match '(?m)npm run baselines:fluxo\s*$') { throw "The battery baseline must be written under the battery stamp (slice 6)." }

$alternated = @(New-BatterySlots -Arms @("com", "sem") -Repetitions 3 -Order "alternado")
if ((($alternated | ForEach-Object { "$($_.arm)$($_.repetition)" }) -join " ") -ne "com1 sem1 sem2 com2 com3 sem3") {
  throw "Alternating schedule must swap arm order in every other block."
}
if ((@($alternated | ForEach-Object { $_.slot }) -join ",") -ne "1,2,3,4,5,6") { throw "Slots must be numbered in execution order." }
$sequential = @(New-BatterySlots -Arms @("com", "sem") -Repetitions 2 -Order "sequencial")
if ((($sequential | ForEach-Object { "$($_.arm)$($_.repetition)" }) -join " ") -ne "com1 com2 sem1 sem2") {
  throw "Sequential schedule must reproduce the previous order."
}
$single = @(New-BatterySlots -Arms @("sem") -Repetitions 2 -Order "alternado")
if ($single.Count -ne 2 -or ($single | Where-Object { $_.arm -ne "sem" })) { throw "Single-arm schedule keeps its arm." }

$newJson = Join-Path ([System.IO.Path]::GetTempPath()) "new-json-$([guid]::NewGuid().ToString('N')).json"
try {
  Write-NewJson -Path $newJson -Value ([ordered]@{ a = 1 })
  $refused = $false
  try { Write-NewJson -Path $newJson -Value ([ordered]@{ a = 2 }) } catch { $refused = $true }
  if (-not $refused) { throw "Battery artifacts must never be overwritten." }
  if ((Get-Content -LiteralPath $newJson -Raw | ConvertFrom-Json).a -ne 1) { throw "A refused write must leave the original intact." }
  if ([System.IO.File]::ReadAllBytes($newJson)[0] -eq 0xEF) { throw "Battery JSON is written without BOM." }
} finally {
  Remove-Item -LiteralPath $newJson -Force -ErrorAction SilentlyContinue
}

Write-Host "test:pipeline - Codex support ok; evidence preservation ok; refused-report contract ok; slice-6 plan/manifest contract ok"
