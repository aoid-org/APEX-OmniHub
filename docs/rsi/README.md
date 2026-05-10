# RSI Foundation (Proposal-Only)

- **Document version:** 1.1.0
- **Last updated (UTC):** 2026-05-10
- **Applies to release line:** APEX-OmniHub v1.6.0+

## Scope and operating mode
APEX OmniHub RSI runs in **proposal-only** mode. Agent automation may prepare proposals, but may not autonomously open/merge high-risk changes.

## Release lockfile policy
- Release lockfile: `package-lock.json`
- Parity lockfiles: `bun.lock`, `deno.lock`, `orchestrator/requirements.lock`

## Model gateway policy (local-first)
`tools/rsi/model_gateway.py` defaults to offline dry-run behavior.
Hosted/OpenAI-compatible execution is opt-in via environment variables:
- `RSI_MODEL_BASE_URL`
- `RSI_MODEL_API_KEY`
- `RSI_MODEL_NAME`
- `RSI_MODEL_PROVIDER`

## Protected surfaces remain human-authored
The following execution-critical surfaces remain human-authored to prevent automation drift:
- `.github/workflows/**`
- `terraform/**`
- `contracts/**`
- `supabase/migrations/**`
- `hardhat.config.cts`

## Operational commands
```bash
bash scripts/repo_inventory.sh
python tools/rsi/model_gateway.py --dry-run
```
