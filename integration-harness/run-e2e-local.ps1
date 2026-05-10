$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

# Resolve repo roots; allow caller override.
if (-not $env:OMNIHUB_REPO) { $env:OMNIHUB_REPO = (Resolve-Path "..\").Path }
if (-not $env:SBBL_REPO) {
  $candidate = Join-Path (Split-Path -Parent $env:OMNIHUB_REPO) "sbbl-hq"
  $env:SBBL_REPO = $candidate
}

if (-not (Test-Path "run.sh")) { throw "run.sh not found in $PSScriptRoot" }
if (-not (Get-Command bash -ErrorAction SilentlyContinue)) { throw "bash not found in PATH" }
if (-not (Test-Path $env:OMNIHUB_REPO)) { throw "OMNIHUB_REPO not found: $env:OMNIHUB_REPO" }
if (-not (Test-Path $env:SBBL_REPO)) { throw "SBBL_REPO not found: $env:SBBL_REPO" }

# Normalize run.sh line endings in-memory to avoid CRLF bash parse failures.
$raw = Get-Content -Raw -Path "run.sh"
$lf  = $raw -replace "`r`n", "`n"
$tmp = Join-Path $env:TEMP "apex-run-e2e-local.sh"
Set-Content -Path $tmp -Value $lf -NoNewline

Write-Host "Using OMNIHUB_REPO=$($env:OMNIHUB_REPO)"
Write-Host "Using SBBL_REPO=$($env:SBBL_REPO)"

# Run through bash explicitly.
bash -n $tmp
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

bash $tmp
exit $LASTEXITCODE
