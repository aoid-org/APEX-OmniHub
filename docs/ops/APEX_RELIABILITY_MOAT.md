# APEX Reliability Moat (Zero-Cost)

## Objective

Harden planner reliability and cache template hydration with no paid dependencies.

## Components

1. `orchestrator/reliability/cache_hydration.py`
- Deterministic recursive placeholder replacement for nested payloads.
- Longest-token-first replacement ordering to avoid partial collisions.

2. `orchestrator/reliability/llm_plan_resilience.py`
- Bounded model fallback chain.
- Request timeout ceiling and max-attempt guardrails.
- Non-retryable terminal failure handling.

3. `orchestrator/reliability/llm_metrics.py`
- Attempt/outcome counters with bounded outcome normalization.
- Low-cardinality labels for Prometheus safety.

## Guardrails

- `LLM_PLAN_MAX_MODEL_ATTEMPTS`: clamped to `1..10`
- `LLM_PLAN_REQUEST_TIMEOUT_SECONDS`: clamped to `5..180`
- Outcome labels outside allowlist collapse to `other`.

## Validation Strategy

- Reliability CI workflow enforces `--cov-fail-under=85`.
- Test suite covers deterministic hydration, fallback boundaries, timeout behavior, and metric cardinality controls.

## Rollback

- Remove imports/calls to `reliability/*` modules.
- Revert workflow `.github/workflows/reliability-ci.yml`.
- Existing orchestrator behavior remains unchanged if modules are not invoked.
