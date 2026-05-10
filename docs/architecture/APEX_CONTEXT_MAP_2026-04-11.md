# APEX OmniHub Context Map (2026-04-11)

## 1) Runtime Planes

1. Frontend control plane (`apps/omnihub-site/`, React + Vite + TypeScript)
2. Edge/API plane (`supabase/functions/`, `api/`)
3. Data plane (`supabase/migrations/`)
4. Workflow plane (`orchestrator/`, Temporal Python)
5. IaC plane (`terraform/`, `.github/workflows/`)

## 2) Primary Execution Paths

### Frontend

- Route entry: `apps/omnihub-site/src/App.tsx`
- Dashboard shell: `apps/omnihub-site/dashboard/OmniDashShell.tsx`
- Modal + spatial orchestration:
  - `apps/omnihub-site/src/stores/omniModalStore.ts`
  - `apps/omnihub-site/src/components/omnidash/`

### Orchestrator

- Worker entry: `orchestrator/main.py`
- Workflow core: `orchestrator/workflows/agent_saga.py`
- Tool activities: `orchestrator/activities/tools.py`
- Semantic cache: `orchestrator/infrastructure/cache.py`
- Metrics: `orchestrator/metrics.py`

### Edge/Data

- Edge workflows trigger: `supabase/functions/trigger-workflow/`
- Agent dispatch + proxy path: `supabase/functions/omnilink-agent/`
- Schema contracts: `supabase/migrations/`

## 3) Quality and Delivery Gates

- JS/TS gates: `lint`, `typecheck`, `test`, `build` from root `package.json`
- Python gates: `orchestrator-ci.yml` (`ruff`, `mypy`, `pytest --cov`)
- Security gates: secret scanning, bandit/safety, security regression workflows

## 4) Production-Reliability Hotspots

- Planner model single-point failure in `generate_plan_with_llm` (now mitigated with bounded fallback)
- Semantic cache placeholder hydration depth in `cache.py` (now recursive)
- Metrics cardinality explosion risk (mitigated via bounded outcome labels)

## 5) New Moat Modules Added in This Pass

- Recursive deterministic cache transformation:
  - `SemanticCacheService._transform_nested_values`
  - `SemanticCacheService._build_replacement_pairs`
- Planner fallback/resilience:
  - `_resolve_model_candidates`
  - fallback attempt loop in `generate_plan_with_llm`
- Planner reliability metrics:
  - `llm_plan_attempts_total`
  - `llm_plan_outcomes_total`
