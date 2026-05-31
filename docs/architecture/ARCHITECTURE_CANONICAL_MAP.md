# APEX OmniHub — Canonical Infrastructure & Architecture Map

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


> **Version:** 2.3.0<br>
> **Last updated:** 2026-05-31<br>
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

## 3) Deployment Truth (2026-05)

- **Production web runtime:** Cloudflare Pages-aligned deployment model.
- **Primary app surface:** `apps/omnihub-site/src/App.tsx`.
- **Root app shim:** `src/App.tsx` intentionally re-exports the app-site app.
- **Build orchestration:** root `vite.config.ts` + app-level Vite config coexist.
- **Legacy references to Vercel and `api/` may still exist in historical docs/scripts; treat them as non-canonical unless explicitly marked active.**
- **Production Supabase project:** `rtopreovkywofgwgmozi` (ca-central-1, ACTIVE_HEALTHY). All public-schema tables have RLS enabled as of 2026-05-04. All SECURITY DEFINER functions have pinned `search_path = public` and revoked `anon` EXECUTE access. OmniBridge persistence layer (`omnibridge_events`, `omnibridge_events_dlq`, `omnibridge_control_audit`) is live since v1.6.1. See `docs/infrastructure/SUPABASE_SETUP.md` for the full security posture and `docs/audits/SUPABASE_SECURITY_AUDIT_2026_05_04.md` for the audit record.
- **Documentation authority:** `docs/DOCUMENTATION_RELEASE_INDEX.md` is the current entry point for maps, READMEs, status records, audits, and runbooks.
- **RSI governance:** `policy/rsi-policy.yaml` is `mode: live`; `.github/workflows/rsi-governance.yml` is the active RSI workflow, while `.github/workflows/rsi-governance-gate.yml` is a pass-through placeholder. See `docs/rsi/BRANCH_PROTECTION_REQUIRED.md`.
- **APEX Agent** (`apex-agent`): canonical AI orchestration endpoint at `supabase/functions/apex-agent/`. OmniSlate routes to it via `invokeMcpIntent → ${SUPABASE_URL}/functions/v1/apex-agent`. `apex-assistant` returns 410 Gone and redirects to `apex-agent`.
- **Migrations (2026-05-27/28):** Three additional migrations applied: `20260527000001` (AEGIS/CHRONOS), `20260528000000` (PhysiOmni RLS), `20260528000001` (OmniConnect Vault).

---

## 4) Runtime Boundaries

### Frontend Boundary
- Entry: `src/main.tsx` mounts `App`.
- `src/App.tsx` forwards to `apps/omnihub-site/src/App.tsx`.
- Post-auth UX consolidates around OmniDash (`/omnidash`, `/dashboard`).


### OmniDash Sidebar Widget Rail Boundary

- **Left sidebar contract:** `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`.
- **Renderer:** `apps/omnihub-site/dashboard/OmniDashShell.tsx` imports `OMNIDASH_SIDEBAR_WIDGETS`.
- **Not a product registry:** Do not derive the left sidebar from `APP_REGISTRY` or `OMNIDASH_CONTRACT`.
- **Locked order:** OmniBoard → PhysiOmni → Audits → Links → Automations → Workflows → Files → Billing → Settings.
- **Excluded from left sidebar:** OmniSkills, Orchestrator, Fortress, OmniPort, Maestro, BYOM.
- **Drift guard:** `eslint.config.js` blocks local `NAV` and `NAV_MODULE_KEY` definitions in `OmniDashShell.tsx`.


### Orchestrator Boundary

There are three distinct Python areas — do not conflate them:

| Area | Role |
|---|---|
| `orchestrator/` | **Temporal Worker** — `main.py` is the worker lifecycle entrypoint; `server.py` is the HTTP ingress for workflow dispatch. This is the primary Python runtime. |
| `services/orchestrator/` | **HTTP API layer** — FastAPI routes in `api/routes.py` that act as a thin glue between HTTP requests and the deterministic FSM in `fsm.py`. Boundary-enforced: `routes.py` must not initialise Temporal Workers (CI guardrail). |
| `src/core/orchestrator/` | **TypeScript contract layer** — TypeScript types and interfaces used by the frontend/gateway to describe orchestration intent. No Python runtime. |

**`omega/` — APEX Resilience Protocol (Human-in-the-Loop Verification)**
- `omega/engine.py` = `VerificationEngine`: create/approve/reject verification requests, XSS-safe storage via `markupsafe`.
- `omega/dashboard.py` = Lightweight `ThreadingHTTPServer` dashboard for reviewing pending approvals. Serves `/api/pending`, `/api/approve`, `/api/reject`.
- `omega/data/` = Shared data structures. `omega/examples/` = Usage samples.
- **Not a Temporal service.** Runs independently; used by the APEX Resilience Protocol for change-approval gates.
- **Coverage:** included in orchestrator pytest CI via `--cov=../omega` (see `ci-runtime-gates.yml`).
- **Security posture:** 4-layer XSS defence (input validation → storage-time escape → retrieval-time escape → `X-Content-Type-Options: nosniff`). Reviewed in `omega/SECURITY_REVIEW.md`.

Boundary validated by CI architectural guardrails (`ci-runtime-gates.yml` Guardrails 0–3).

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

