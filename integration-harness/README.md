# Integration Harness (OmniHub ↔ SBBL-HQ)

## Local E2E prerequisites
- Local repo layout:
  - `/workspace/APEX-OmniHub`
  - `/workspace/sbbl-hq` (or set `SBBL_REPO`)
- Populate `integration-harness/.env` from `.env.example`.
- Required envs: `SBBL_SUPABASE_URL`, `SBBL_SUPABASE_ANON_KEY`, one service-role key alias, admin/fan credentials.

## Run
```bash
cd /workspace/APEX-OmniHub/integration-harness
cp .env.example .env
bash run.sh
```

## Artifacts
- HTML report: `integration-harness/playwright-report/index.html`
- traces/videos/screenshots: `integration-harness/playwright-results/`
