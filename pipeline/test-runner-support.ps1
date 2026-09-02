$ErrorActionPreference = "Stop"

$runner = Join-Path $PSScriptRoot "run-battery.ps1"
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($runner, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw "run-battery.ps1 has syntax errors." }

$wanted = @("ConvertTo-TomlString", "ConvertTo-TomlArray", "Get-CodexMcpConfigArgs", "Get-CodexLogSummary")
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
  '"--effort", $ReasoningEffort'
)) {
  if (-not $runnerText.Contains($contract)) { throw "Missing runner metadata contract: $contract" }
}

$settings = Get-Content -LiteralPath (Join-Path $PSScriptRoot "settings-run.json") -Raw | ConvertFrom-Json
if ($settings.permissions.allow -notcontains "mcp__playwright__browser_resize") {
  throw "The scored-run permission set must allow browser_resize when the protocol measures reflow."
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

Write-Host "test:pipeline - Codex support ok"
