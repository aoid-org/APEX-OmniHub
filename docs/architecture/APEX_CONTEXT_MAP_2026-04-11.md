# APEX Context Map - 2026-04-11

## Runtime Planes

1. Frontend Control Plane
- `apps/omnihub-site/`

2. Edge/API Plane
- `supabase/functions/`
- `api/`

3. Data Plane
- `supabase/migrations/`

4. Workflow Plane
- `orchestrator/`

5. IaC Plane
- `terraform/`

## Reliability Focus Surface

- Planner generation path (LLM calls)
- Semantic plan hydration path
- Observability counters used for planner health

## Added Reliability Assets

- `orchestrator/reliability/cache_hydration.py`
- `orchestrator/reliability/llm_plan_resilience.py`
- `orchestrator/reliability/llm_metrics.py`

## Verification Assets

- `orchestrator/tests/test_cache_hydration_reliability.py`
- `orchestrator/tests/test_llm_metrics_module.py`
- `orchestrator/tests/test_llm_plan_resilience_module.py`
- `.github/workflows/reliability-ci.yml`

## Intended Integration Targets

- `orchestrator/infrastructure/cache.py`
- `orchestrator/activities/tools.py`
- `orchestrator/main.py`
