# RSI Foundation (Proposal-Only)

APEX OmniHub RSI is configured in **proposal-only** mode: no autonomous PR/merge actions for high or critical paths.

## Lockfile policy
- Release lockfile: `package-lock.json`.
- Parity lockfiles: `bun.lock`, `deno.lock`, `orchestrator/requirements.lock`.

## Local-first model gateway
`tools/rsi/model_gateway.py` defaults to offline dry-run behavior.
Hosted/OpenAI-compatible execution is opt-in via environment variables:
- `RSI_MODEL_BASE_URL`
- `RSI_MODEL_API_KEY`
- `RSI_MODEL_NAME`
- `RSI_MODEL_PROVIDER`

## Human-authored protected surfaces
Workflows, contracts, Terraform, and Supabase migrations remain human-authored to prevent execution-path automation drift and preserve review accountability.

## Local commands
```bash
bash scripts/repo_inventory.sh
python tools/rsi/model_gateway.py --dry-run
```
