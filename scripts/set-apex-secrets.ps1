param(
  [Parameter(Mandatory = $true)] [string]$GhToken,
  [Parameter(Mandatory = $true)] [string]$SupabaseToken,
  [Parameter(Mandatory = $true)] [string]$SupabaseServiceRoleKey,
  [Parameter(Mandatory = $false)] [string]$SupabaseUrl = 'https://rtopreovkywofgwgmozi.supabase.co'
)

$ErrorActionPreference = 'Stop'

$env:GH_TOKEN = $GhToken
$env:SUPABASE_TOKEN = $SupabaseToken
$env:SUPABASE_SERVICE_ROLE_KEY = $SupabaseServiceRoleKey
$env:SUPABASE_URL = $SupabaseUrl

Write-Host 'Environment variables loaded for current PowerShell session:'
Get-ChildItem Env:GH_TOKEN,Env:SUPABASE_TOKEN,Env:SUPABASE_SERVICE_ROLE_KEY,Env:SUPABASE_URL |
  ForEach-Object { " - $($_.Name)=<set>" }
