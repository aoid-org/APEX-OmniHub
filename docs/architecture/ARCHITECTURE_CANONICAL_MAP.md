# APEX OmniHub — Canonical Infrastructure & Architecture Map

> **Version:** 2.1.0  
> **Last updated:** 2026-04-26  
> **Status:** Canonical (source of truth)

This document is optimized for **onboarding clarity** and **operator execution** while preserving value proposition context.

---

## 1) Platform Value Proposition (Concise)

APEX OmniHub is a governed orchestration platform that unifies:
- product surface (web app),
- execution plane (edge + orchestrator),
- policy and auditability controls,
- and repeatable deployment operations.

It is designed to convert intent into controlled execution across heterogeneous systems with observable, testable gates.

---

## 2) TL;DR System Shape

APEX OmniHub is a polyglot monorepo with five execution planes:

1. **Frontend Control Plane** — React **18.3.1** + Vite 7 + TypeScript, primarily in `apps/omnihub-site/`.
2. **Edge/API Plane** — Supabase Edge Functions in `supabase/functions/` and shared middleware in `supabase/functions/_shared/`.
3. **Data Plane** — Supabase Postgres schema + migrations in `supabase/migrations/`.
4. **Workflow Plane** — Temporal Python orchestrator in `orchestrator/` (`main.py` worker, `server.py` API).
5. **Infra-as-Code Plane** — Terraform stacks/modules in `terraform/`.

---

## 3) Deployment Truth (2026-04)

- **Production web runtime:** Cloudflare Pages-aligned deployment model.
- **Primary app surface:** `apps/omnihub-site/src/App.tsx`.
- **Root app shim:** `src/App.tsx` intentionally re-exports the app-site app.
- **Build orchestration:** root `vite.config.ts` + app-level Vite config coexist.
- **Legacy references to Vercel and `api/` may still exist in historical docs/scripts; treat them as non-canonical unless explicitly marked active.**

---

## 4) Runtime Boundaries

### Frontend Boundary
- Entry: `src/main.tsx` mounts `App`.
- `src/App.tsx` forwards to `apps/omnihub-site/src/App.tsx`.
- Post-auth UX consolidates around OmniDash (`/omnidash`, `/dashboard`).

### Orchestrator Boundary
- `orchestrator/main.py` = Temporal worker lifecycle.
- `orchestrator/server.py` = HTTP ingress + workflow dispatch.
- Boundary validated by CI architectural guardrails.

### Edge Boundary
- HTTP/auth/cors wrappers centralized in `supabase/functions/_shared`.
- JWT requirements set per function in `supabase/config.toml`.

---

## 5) Onboarding Fast Paths

### A) New Engineer (first 60 minutes)
1. Read `docs/architecture/CANONICAL_TRUTH.md`.
2. Read this file end-to-end.
3. Run: `npm run typecheck && npm run lint && npm run test`.
4. Review `.github/workflows/ci-runtime-gates.yml`.

### B) DevOps/SRE onboarding
1. Read `docs/infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md`.
2. Read `docs/infrastructure/CI_RUNTIME_GATES.md`.
3. Read `docs/ops/INCIDENT_RESPONSE.md`.
4. Read `docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md`.

### C) Platform Integrations onboarding
1. Read `docs/infrastructure/MIGRATION_RUNBOOK.md`.
2. Read `docs/platform/OMNIPORT_API_REFERENCE.md`.
3. Read relevant `supabase/functions/*` handlers.

---

## 6) Build & Validation Topology

The repository intentionally supports multi-domain validation:
- JS/TS: lint/typecheck/vitest/playwright
- Python orchestrator: ruff/pytest
- Smart contracts: hardhat compile/test/deploy gates
- Simulation/chaos: `sim:*` pipelines
- Security/compliance: secret scans + guardrail workflows

---

## 7) Canonical References

- Architecture details: `docs/architecture/DETAILED_SYSTEM_DESIGN.md`
- Frontend map: `docs/architecture/frontend-map.md`
- CI behavior: `docs/infrastructure/CI_RUNTIME_GATES.md`
- Ops index: `docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md`
- Migration runbook: `docs/infrastructure/MIGRATION_RUNBOOK.md`
- Production deploy: `docs/infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md`
- Reconciliation matrix: `docs/architecture/DOC_RECONCILIATION_MATRIX.md`

---

## 8) Archived Deep-Dive References

To preserve prior detail and historical operational context, legacy full-length documents are retained under:

- `docs/archive/legacy-runbooks/PRODUCTION_DEPLOYMENT_GUIDE_legacy.md`
- `docs/archive/legacy-runbooks/CI_RUNTIME_GATES_legacy.md`
- `docs/archive/legacy-runbooks/MIGRATION_RUNBOOK_legacy.md`
- `docs/archive/legacy-runbooks/OPS_RUNBOOK_legacy_2026-01-25.md`

