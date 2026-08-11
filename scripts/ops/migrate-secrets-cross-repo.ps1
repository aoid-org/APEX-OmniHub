<#
Migrates GitHub Actions repo secrets between two repos by name. Secret
names are discovered live via `gh secret list` (never hardcoded); values
are sourced from a local dotenv/markdown file and piped to `gh secret set`
over stdin only, never as a CLI arg, never logged, never written here.

Defaults to a dry run (prints what would be migrated). Pass -Force to
actually write secrets to TargetRepo.

Usage:
  .\migrate-secrets-cross-repo.ps1 -SourceRepo owner/repo -TargetRepo owner/repo -EnvFile "C:\path\to\env.md"
  .\migrate-secrets-cross-repo.ps1 -SourceRepo owner/repo -TargetRepo owner/repo -EnvFile "C:\path\to\env.md" -Force
#>

param(
    [Parameter(Mandatory = $true)] [string]$SourceRepo,
    [Parameter(Mandatory = $true)] [string]$TargetRepo,
    [Parameter(Mandatory = $true)] [string]$EnvFile,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI (gh) not found on PATH."
    exit 1
}

gh auth status *>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "gh is not authenticated. Run 'gh auth login' first."
    exit 1
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
    Write-Error "Env file not found: $EnvFile"
    exit 1
}

$secretListJson = gh secret list --repo $SourceRepo --json name 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to list secrets on $SourceRepo (check repo name and permissions).`n$secretListJson"
    exit 1
}

$secretNames = @($secretListJson | ConvertFrom-Json | ForEach-Object { $_.name })
if ($secretNames.Count -eq 0) {
    Write-Warning "No secrets found on $SourceRepo - nothing to migrate."
    exit 0
}

# Build the value-matcher without embedding literal backticks/quotes directly
# in a double-quoted string (avoids PowerShell backtick-escape ambiguity).
$bt = [char]96
$dq = [char]34
$sq = "'"
$prefixClass  = "[\s|$bt*_\-]*"
$midClass     = "[\s$bt$dq$sq*]*"
$optQuote     = "[$bt$dq$sq]?"
$captureClass = "[^\r\n$bt$dq$sq|]+"
$placeholderPattern = '^(TODO|REDACTED|CHANGEME|<.*>|x{3,}|\.\.\.)$'

$content = Get-Content -LiteralPath $EnvFile -Raw

$toMigrate = New-Object System.Collections.Generic.List[string]
$missing   = New-Object System.Collections.Generic.List[string]
$skipped   = New-Object System.Collections.Generic.List[string]
$values    = @{}

foreach ($name in $secretNames) {
    $escaped = [regex]::Escape($name)
    $pattern = "(?m)^$prefixClass$escaped$midClass[:=|]\s*$optQuote($captureClass)"
    $match = [regex]::Match($content, $pattern)

    if (-not $match.Success) {
        $missing.Add($name)
        continue
    }

    $value = $match.Groups[1].Value.Trim().TrimEnd($bt, ' ')
    if (-not $value -or $value -match $placeholderPattern) {
        $skipped.Add($name)
        continue
    }

    $values[$name] = $value
    $toMigrate.Add($name)
}

Write-Host ""
Write-Host "Source: $SourceRepo -> Target: $TargetRepo" -ForegroundColor Cyan
Write-Host "Would migrate $($toMigrate.Count) of $($secretNames.Count) secrets:" -ForegroundColor Cyan
$toMigrate | ForEach-Object { Write-Host "  [ ] $_" }

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "Not found in env file:" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  [--] $_" -ForegroundColor Yellow }
}
if ($skipped.Count -gt 0) {
    Write-Host ""
    Write-Host "Skipped (empty or placeholder value):" -ForegroundColor Yellow
    $skipped | ForEach-Object { Write-Host "  [??] $_" -ForegroundColor Yellow }
}

if (-not $Force) {
    Write-Host ""
    Write-Host "Dry run only, no secrets were written. Re-run with -Force to apply." -ForegroundColor Magenta
    exit 0
}

Write-Host ""
$failed = New-Object System.Collections.Generic.List[string]
foreach ($name in $toMigrate) {
    $values[$name] | gh secret set $name --repo $TargetRepo | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [ok] $name" -ForegroundColor Green
    } else {
        Write-Warning "  [fail] $name (exit $LASTEXITCODE)"
        $failed.Add($name)
    }
}

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "$($failed.Count) secret(s) failed to migrate." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Migrated $($toMigrate.Count) secret(s) to $TargetRepo." -ForegroundColor Green
