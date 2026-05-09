# APEX Reliability Moat (Zero-Cost, Production-Grade)

## Scope

This document captures the production hardening shipped for the orchestrator planning path and semantic cache:

- Recursive, deterministic template hydration in `orchestrator/infrastructure/cache.py`
- Bounded model fallback with policy checks in `orchestrator/activities/tools.py`
- Low-cardinality planner reliability metrics in `orchestrator/metrics.py`

## Proprietary Moat Components

### 1) Recursive Deterministic Hydration

The semantic cache now rewrites placeholders recursively across nested dict/list payloads.  
This removes silent miss-hydration for deeply nested tool inputs and keeps cached plans executable.

Guardrails:

- Deterministic replacement order (longest key first) to avoid partial overlap corruption
- No mutation of non-string scalar fields
- Symmetric behavior for both parameterization and injection

### 2) Bounded Adaptive Model Fallback

Plan generation now attempts an ordered model chain:

1. requested model (if provided)
2. tenant model
3. default model
4. fallback chain from `LLM_FALLBACK_MODELS`

Hard limits:

- Maximum attempts controlled by `LLM_PLAN_MAX_MODEL_ATTEMPTS` (default `3`, minimum `1`)
- Per-attempt timeout controlled by `LLM_PLAN_REQUEST_TIMEOUT_SECONDS` (default `45`)
- Tenant allow-list still enforced before execution

Fail-safe logic:

- Primary model failure can auto-recover via fallback model(s)
- If all models fail with non-retryable validation outcomes, planner hard-blocks with non-retryable error
- Unknown outcome labels are normalized to `unknown` to protect metrics cardinality

### 3) Reliability Metrics (Prometheus)

New counters:

- `llm_plan_attempts_total{workflow_type}`
- `llm_plan_outcomes_total{workflow_type, outcome}`

Outcomes are bounded to:

- `primary_success`
- `fallback_success`
- `all_failed`
- `non_retryable_block`
- `unknown` (normalization bucket)

## Environment Variables

- `DEFAULT_LLM_MODEL`
- `LLM_FALLBACK_MODELS` (comma-separated)
- `LLM_PLAN_MAX_MODEL_ATTEMPTS` (int, default `3`)
- `LLM_PLAN_REQUEST_TIMEOUT_SECONDS` (float/int, default `45`)

## Contingency / Rollback Plan

If fallback behavior needs immediate rollback:

1. Set `LLM_PLAN_MAX_MODEL_ATTEMPTS=1` to force primary-only behavior.
2. Clear `LLM_FALLBACK_MODELS`.
3. Keep metrics active to monitor whether failures normalize.

This rollback is config-only and requires no schema change or redeploy of dependencies.
