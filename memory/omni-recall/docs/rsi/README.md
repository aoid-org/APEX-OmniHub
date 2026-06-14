---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# RSI Governance Gate

| Field | Value |
|---|---|
| Document version | 2.0.0 |
| Last updated (UTC) | 2026-05-15 |
| Applies to release line | APEX-OmniHub v1.6.0+ |
| Lifecycle status | Live — enforced on pull_request to main/master |
| Owner | @apexbusiness-systems |
| Policy reference | `policy/rsi-policy.yaml` v1.3.0 |

## Overview

RSI (Release Safety Intelligence) is APEX-OmniHub's automated governance and release-safety gate. It runs on every pull request targeting `main` or `master`, collects deterministic evidence about which files changed, enforces path-based policy rules, and optionally consults a hosted model advisory. The gate outputs a machine-readable `decision.json` artifact and fails the pipeline when a protected path is touched or when a required model advisory is unavailable during an escalation.

## Architecture

```
┌─────────────────────┐
│  build_evidence.py  │  Collects: changed files, classifications,
│  (CI or local mode) │  diff stats, inventory summary, test plan
└────────┬────────────┘
         │ artifacts/rsi/evidence.json
         ▼
┌─────────────────────┐
│  policy_engine.py   │  Deterministic: protected paths → block,
│  (no network calls) │  critical paths → escalate, docs → allow
└────────┬────────────┘
         │ artifacts/rsi/policy_result.json
         ▼
┌─────────────────────┐
│  model_gateway.py   │  Optional: consults hosted model ONLY when
│  (conditional)      │  model_usage_allowed == true in policy result
└────────┬────────────┘
         │ artifacts/rsi/model_result.json (if enabled)
         ▼
┌─────────────────────┐
│  decision.py        │  Combines all inputs. Deterministic result
│  (combiner)         │  ALWAYS wins. Writes decision.json. Exits 1
└─────────────────────┘  on abort == true (block decision).
         │ artifacts/rsi/decision.json
```

## Running Locally

```bash
# Full dry run: evidence + policy + decision (no model calls, even if env vars set)
bun run rsi:dry

# Build evidence bundle only
bun run rsi:evidence

# Run the Python test suite
bun run rsi:test

# Full CI-mode run (reads GITHUB_* env vars)
bun run rsi:ci
```

Or directly via Python:

```bash
python3 tools/rsi/build_evidence.py
python3 tools/rsi/policy_engine.py
python3 tools/rsi/decision.py
cat artifacts/rsi/decision.json
```

## CI Integration

The workflow `.github/workflows/rsi-governance.yml` triggers on:
- `pull_request` to `main` or `master`
- `workflow_dispatch` (manual trigger)

### What the workflow does

1. Checks out the repository with full git history (`fetch-depth: 0`)
2. Installs RSI Python deps (`pyyaml` only)
3. Runs `scripts/repo_inventory.sh` to generate file inventory
4. Runs `build_evidence.py --ci` — derives changed files from `GITHUB_BASE_REF` / `GITHUB_HEAD_REF`
5. Runs `policy_engine.py` — deterministic path classification and decision
6. Runs `model_gateway.py` — only if `RSI_MODEL_ENABLED` secret is set
7. Runs `decision.py` — combines results, writes `decision.json`
8. Validates `decision.json` schema inline
9. Uploads all artifacts with 30-day retention
10. Exits 1 if `abort == true` (decision is `block`)

### Fork PR behavior

The workflow uses `pull_request` (not `pull_request_target`). Secrets are unavailable on fork PRs. The policy engine runs normally; the model gateway is automatically skipped when `RSI_MODEL_ENABLED` is empty.

### Manual dispatch behavior

When triggered via `workflow_dispatch`, there is no PR context. The evidence builder uses `git log HEAD~3..HEAD` for diff computation and sets `generation_mode: "manual"`. The minimum outcome is `escalate` — `workflow_dispatch` never auto-allows.

## Artifact Reference

| Artifact path | Purpose | Retention | Schema |
|---|---|---|---|
| `artifacts/rsi/evidence.json` | Changed paths, classifications, diff stats, inventory | 30 days | `EvidenceBundle` in `tools/rsi/types.py` |
| `artifacts/rsi/policy_result.json` | Deterministic classification output | 30 days | `PolicyResult` in `tools/rsi/types.py` |
| `artifacts/rsi/model_result.json` | Hosted model advisory (if enabled) | 30 days | `ModelResult` in `tools/rsi/types.py` |
| `artifacts/rsi/decision.json` | Final gate output — machine-readable | 30 days | `FinalDecision` in `tools/rsi/types.py` |
| `inventory/repo-inventory.txt` | Repo inventory output | 30 days | Plain text |

## Decision Outcomes

| Decision | Exit code | `abort` | Risk | Action required |
|---|---|---|---|---|
| `allow` | 0 | false | low/medium | None — PR may merge normally |
| `escalate` | 0 | false | high | Human review required before merge |
| `block` | 1 | true | critical | Pipeline fails — protected path touched or escalation advisory unavailable |

## Protected Paths

Protected paths are defined in `policy/rsi-policy.yaml` under `protected_paths`. Any PR touching a protected path triggers `decision: block` regardless of model advisory output.

To add a protected path:

```yaml
protected_paths:
  - .github/workflows/**
  - your/new/protected/path/**
```

Critical paths (under `critical_paths`) trigger `decision: escalate` and allow model advisory evaluation. Negative patterns (prefixed with `!`) exclude sub-paths from critical classification.

## Model Advisory

The model gateway is activated when:
1. `policy_result.model_usage_allowed == true` (decision is `escalate`, no protected hits)
2. `RSI_MODEL_ENABLED` secret is set and non-empty
3. `RSI_MODEL_ENDPOINT` and `RSI_MODEL_API_KEY` secrets are configured

The model advisory **cannot** return `block` — only `allow` or `escalate`. It can soften an escalation (recorded but outcome stays `escalate`) or confirm it. It never overrides the deterministic policy engine.

To enable:
1. Set `RSI_MODEL_ENABLED` to any non-empty value in GitHub repository secrets
2. Set `RSI_MODEL_ENDPOINT` to your OpenAI-compatible endpoint URL
3. Set `RSI_MODEL_API_KEY` to your API key

## Admin-Only Follow-Ups

The following actions require GitHub repository admin access and are NOT automated:

1. Navigate to **Settings > Branches > Branch protection rules > main**
2. Enable **"Require status checks to pass before merging"**
3. Add required check: **`RSI Governance Gate / rsi-governance`**
4. Enable **"Require branches to be up to date before merging"**

These steps are not performed by any code in this repository.

## What RSI Does NOT Do

- RSI is **not a replacement for code review** — it is a governance gate, not a review tool
- RSI is **not a security scanner** — use `npm run secret:scan` and `npm run security:audit` for security scanning
- RSI **does not block fork PRs differently** from internal PRs — both use `pull_request` trigger and the same deterministic policy
- RSI **does not auto-merge** PRs — `auto_merge_allowed: false` in policy
- RSI **does not audit secrets** — it scrubs evidence artifacts before model submission
