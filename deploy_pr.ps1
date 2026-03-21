$ErrorActionPreference = "Stop"

git stash
git checkout main
git pull origin main --ff-only

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$branch = "apex/omnihub/fix-security-deps-$timestamp"
git checkout -b $branch

git stash pop

git add package.json package-lock.json bun.lock .github/workflows/compliance.yml
git commit -m "fix(security): resolve CVE-2026-1525, S8264, and prototype pollution via overrides"
git push -u origin $branch

Write-Host "PR_LINK: https://github.com/apexbusiness-systems/APEX-OmniHub/compare/main...$branch?expand=1"
