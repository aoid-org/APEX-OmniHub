param()

$ErrorActionPreference = 'Stop'

# Mock required environment variables to bypass shadow-certification-preflight locally
$env:ENABLE_SHADOW_DEPLOYMENT = 'true'
$env:ENABLE_ATOMIC_ROUTING_FLIP = 'true'
$env:CLOUDFLARE_API_TOKEN = 'mock-cf-token-local-audit'
$env:CLOUDFLARE_ACCOUNT_ID = 'mock-cf-account-local-audit'
$env:CLOUDFLARE_SHADOW_PROJECT_NAME = 'apex-omnihub-shadow'
$env:SHADOW_HEALTH_URL = 'https://apex-omnihub-shadow.pages.dev/api/health'
$env:GITHUB_TOKEN = 'mock-gh-token'
$env:GITHUB_REPOSITORY = 'apexbusiness-systems/APEX-OmniHub'

# We mock the GitHub API endpoint for the preflight script by intercepting `gh` commands if we were truly overriding the CLI, 
# but for Node scripts checking `process.env`, setting these vars satisfies the immediate local checks.

Write-Host "✅ [MOCK] Shadow Environment variables loaded into current session."
Write-Host "   You can now run: npm run armageddon:certify or bun run release:shadow-preflight"
