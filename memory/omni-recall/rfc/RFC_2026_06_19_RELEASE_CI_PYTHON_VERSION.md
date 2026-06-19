---
version: 1.0.0
last_audited: 2026-06-19
status: verified
---

# RFC: Pin Release CI to Python 3.11 + Repair Migration History Entry

Status: Approved
Owner: APEX Platform
Date: 2026-06-19
Related Tickets: /pull/1428 (fixes post-merge regressions from /pull/1427)
Affected Domains: CI/CD, Orchestrator, Database Migrations

---

## 1. Problem

Two CI jobs fail after PR #1427 merged to main:

1. **Release job** — `ImportError: cannot import name 'UTC' from 'datetime'` when pytest collects `orchestrator/tests/test_apex_control_plane.py`. The ubuntu-22.04 runner's default Python is 3.10; `guardian_fabric.py` and `tools/rsi/policy_engine.py` both use `from datetime import UTC`, which requires Python 3.11+.

2. **Deploy Supabase Edge Functions** — `supabase db push --include-all` aborts because the remote `schema_migrations` table contains entry `20260527115625` with no matching local file.

## 2. Proposed Change

- **`.github/workflows/release.yml`**: Add `actions/setup-python@v5` pinned to Python 3.11 before the pip/pytest steps. Aligns the Release job with the Python version already used by the RSI governance workflow and assumed by the codebase.
- **`supabase/migrations/20260527115625_repair_history.sql`**: Add comment-only placeholder file so the local migration directory matches the remote `schema_migrations` table.

## 3. Security Impact

None. No changes to security modules, RLS policies, authentication, or secrets. No protected paths (orchestrator/security/**, src/security/**, src/guardian/**, src/zero-trust/**) are touched.

## 4. Rollback Strategy

- Revert `release.yml` to remove the `setup-python` step if 3.11 causes incompatibilities.
- The migration placeholder is a no-op SQL file; removing it would re-introduce the `db push` mismatch.

## 20. Architecture Review Checklist

- [x] No god object introduced
- [x] Domain boundary preserved
- [x] Cross-domain database writes avoided
- [x] Rollback path defined
- [x] Security impact reviewed (none)
- [x] Scope boundaries explicit

## 21. Approval

Architecture Reviewer: APEX Platform / 2026-06-19
