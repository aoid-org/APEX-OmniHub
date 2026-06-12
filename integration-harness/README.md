---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Integration Harness (OmniHub ↔ SBBL-HQ)

## Local E2E prerequisites
- Local repo layout:
  - `/workspace/APEX-OmniHub`
  - `/workspace/sbbl-hq` (or set `SBBL_REPO`)
- Populate `integration-harness/.env` from `.env.example`.
- Required envs: `SBBL_SUPABASE_URL` (or `SUPABASE_URL`), `SBBL_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY`), one service-role key alias, admin/fan credentials.

## Run (Linux/WSL)
```bash
cd /workspace/APEX-OmniHub/integration-harness
cp .env.example .env
bash run.sh
```

## Run (Windows PowerShell)
```powershell
cd integration-harness
$env:OMNIHUB_REPO="C:\path\to\APEX-OmniHub"
$env:SBBL_REPO="C:\path\to\sbbl-hq"
npm run e2e:local:win
```

If `run-e2e-local.ps1` is missing locally, restore it first:
```powershell
git checkout -- .\run-e2e-local.ps1 .\run-e2e-local.cmd
```

## Artifacts
- HTML report: `integration-harness/playwright-report/index.html`
- traces/videos/screenshots: `integration-harness/playwright-results/`
