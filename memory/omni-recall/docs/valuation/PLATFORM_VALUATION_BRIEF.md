---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v8.1-MARKETING-REFRESH | LAST_UPDATED=2026-05-20 -->
# APEX OmniHub Platform Brief (Repository-Verified)

- **Document Version:** 9.0.0
- **Effective Date:** 2026-02-26
- **Source of Truth:** Repository state in `apexbusiness-systems/APEX-OmniHub`
- **Purpose:** External-facing platform overview grounded in verifiable implementation artifacts.

---

## Executive Summary

APEX OmniHub is an AI orchestration platform that combines a React-based control plane, Supabase edge functions, and Python Temporal workflows. This brief intentionally reports only implementation details that can be validated directly from repository contents.

---

## Repository-Verified Product Footprint (2026-02-26)

| Area | Verified Evidence |
| --- | --- |
| Frontend application | `src/` contains 277 files, including TypeScript and TSX application code. |
| Routing surface | `src/pages/` contains 27 page files. |
| Edge runtime | `supabase/functions/` contains 22 serverless function directories. |
| Data layer evolution | `supabase/migrations/` contains 48 SQL migration files. |
| Workflow orchestration | `orchestrator/` contains Python orchestration/worker code and deployment assets. |
| CI/CD automation | `.github/workflows/` contains 12 workflow definitions. |
| Automated testing | `tests/` and `e2e/` include 86 test specs (`*.test.ts`, `*.spec.ts`). |

---

## Capability Narrative (Backed by Repository Artifacts)

### 1) Control Plane + UI Layer

The project includes a production-oriented frontend with route-level pages, componentized UI, and platform shell logic in `src/`.

### 2) Serverless Integration Layer

Supabase Edge Functions in `supabase/functions/` provide backend actions for platform workflows, automation, and integration points.

### 3) Durable Workflow Layer

The `orchestrator/` package includes Temporal-oriented workflow execution with activity and workflow modules, plus deployment and monitoring assets.

### 4) Governance + Security Foundations

Security/compliance materials and controls are represented by migration history, workflow policies, and dedicated documentation in `docs/security/`, `docs/compliance/`, and `docs/audits/`.

---

## Commercial Readiness Notes

The repository demonstrates substantial technical packaging and operational intent. Financial projections, customer metrics, and valuation multiples are intentionally excluded from this version unless tied to signed finance records outside the codebase.

---

## Versioning & Review Cadence

- **Current Version:** 9.0.0
- **Review Cadence:** Monthly or upon material product changes (routes, functions, migrations, CI topology).
- **Change Control Rule:** Any quantitative claim must be reproducible from repository evidence or linked to an external audited source.

---

## Recommended Quick Upgrades

1. Add a generated `docs/valuation/REPO_METRICS_SNAPSHOT.json` artifact in CI so this brief can reference immutable build-time numbers.
2. Add a lightweight docs linter rule to block unverifiable commercial claims in institutional/marketing documents.
3. Publish a dated `docs/marketing/FACT_SHEET.md` that mirrors these verified metrics for sales handoff consistency.
