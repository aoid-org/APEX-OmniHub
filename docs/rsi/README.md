# RSI Foundation (Proposal-Only)

| Field | Value |
|---|---|
| Document version | 1.2.0 |
| Last updated (UTC) | 2026-05-10 |
| Applies to release line | APEX-OmniHub v1.6.0+ |
| Lifecycle status | Active proposal baseline |
| Owner | @apexbusiness-systems |

## Scope and operating mode
APEX OmniHub RSI is intentionally **proposal-only**. Automation may prepare evidence and proposals, but must not autonomously merge high-risk or critical-path changes.

## Release lockfile policy
- Release lockfile: `package-lock.json`
- Parity lockfiles: `bun.lock`, `deno.lock`, `orchestrator/requirements.lock`

## Model gateway policy (local-first)
`tools/rsi/model_gateway.py` defaults to offline dry-run behavior.
Hosted/OpenAI-compatible execution is opt-in through:
- `RSI_MODEL_BASE_URL`
- `RSI_MODEL_API_KEY`
- `RSI_MODEL_NAME`
- `RSI_MODEL_PROVIDER`

## Protected surfaces remain human-authored
Execution-critical surfaces remain human-authored to prevent automation drift:
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

## Change log
- **2026-05-10 (v1.2.0):** standardized governance metadata table and lifecycle status language.
- **2026-05-10 (v1.1.0):** initial proposal-only RSI baseline published.
