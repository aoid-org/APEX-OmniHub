# APEX OmniHub — Canonical Infrastructure & Architecture Map

> **Version:** 2.0.0
> **Last updated:** 2026-04-26
> **Status:** Canonical (source of truth)

## 1) TL;DR System Shape

APEX OmniHub is a polyglot monorepo with five execution planes:

1. **Frontend Control Plane** — React **18.3.1** + Vite 7 + TypeScript, primarily in `apps/omnihub-site/`.  
2. **Edge/API Plane** — Supabase Edge Functions in `supabase/functions/` and shared middleware in `supabase/functions/_shared/`.  
3. **Data Plane** — Supabase Postgres schema + migrations in `supabase/migrations/`.  
4. **Workflow Plane** — Temporal Python orchestrator in `orchestrator/` (`main.py` worker, `server.py` API).  
5. **Infra-as-Code Plane** — Terraform stacks/modules in `terraform/`.

## 2) Deployment Truth (2026-04)

- **Production web runtime:** Cloudflare Pages deployment model (see release readiness evidence and CF Pages migration notes).
- **Primary app surface:** `apps/omnihub-site/src/App.tsx`.
- **Root app shim:** `src/App.tsx` intentionally re-exports the app-site `App`.
- **Build orchestration:** root `vite.config.ts` + app-level Vite config (`apps/omnihub-site/vite.config.ts`) coexist.
- **Legacy references to Vercel and `api/` may still exist in historical docs/scripts; treat them as non-canonical unless explicitly marked active.**

## 3) Runtime Boundaries

### Frontend
- Entry: `src/main.tsx` mounts `App`.
- `src/App.tsx` is a shim to `../apps/omnihub-site/src/App`.
- Post-auth UX is consolidated around OmniDash (`/omnidash`, `/dashboard`) with protected routing.

### Orchestrator
- `orchestrator/main.py` is a pure Temporal worker lifecycle entrypoint.
- `orchestrator/server.py` is HTTP ingress + workflow dispatch API.
- Boundary is enforced by CI runtime guardrails.

### Edge Functions
- Standardized request/cors/auth wrappers are centralized in `_shared` modules.
- JWT verification is function-specific in `supabase/config.toml`.

## 4) Build & Test Topology

The repository intentionally supports multi-domain validation:

- JS/TS: lint/typecheck/vitest/playwright
- Python orchestrator: ruff/pytest
- Smart contracts: hardhat compile/test/deploy gates
- Simulation/chaos: `sim:*` pipelines
- Security/compliance: secret scans + guardrail workflows

## 5) Canonical References

- Architecture details: `docs/architecture/DETAILED_SYSTEM_DESIGN.md`
- Frontend map: `docs/architecture/frontend-map.md`
- CI behavior: `docs/infrastructure/CI_RUNTIME_GATES.md`
- Ops index: `docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md`
- Migration runbook: `docs/infrastructure/MIGRATION_RUNBOOK.md`
- Production deploy: `docs/infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md`
- Reconciliation matrix: `docs/architecture/DOC_RECONCILIATION_MATRIX.md`

