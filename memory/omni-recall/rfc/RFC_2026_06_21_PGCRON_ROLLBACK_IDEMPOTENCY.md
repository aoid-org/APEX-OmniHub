---
version: 1.0.0
last_audited: 2026-06-21
status: verified
---

# RFC: Make pg_cron Receipts-Cleanup Rollback Idempotent + Drop Duplicate-Version Migration

Status: Approved
Owner: APEX Platform
Date: 2026-06-21
Related Tickets: /pull/1448 (fixes "Deploy Supabase Edge Functions" CI failure)
Affected Domains: CI/CD, Database Migrations

---

## 1. Problem

The "Deploy Supabase Edge Functions" CI step failed in
`supabase db push --include-all`:

```
ERROR: could not find valid entry for job 'clean-receipts' (SQLSTATE XX000)
```

Two latent bugs in the `20260226000001` rollback pair:

1. **Non-idempotent unschedule.** `supabase/migrations/20260226000001_rollback.sql`
   called `cron.unschedule('clean-receipts')` unconditionally. `pg_cron`'s
   `unschedule(name)` raises `XX000` when the named job does not exist, so the
   file's "idempotent" comment was false. On the remote DB the job had already
   been removed (by `20260226000004`), so every push aborted on statement 1.

2. **Duplicate primary-key version.** `20260226000001_rollback_receipt_cleanup.sql`
   was an empty (0-byte) file sharing the **same** version `20260226000001` as the
   file above. `supabase_migrations.schema_migrations` has `PRIMARY KEY (version)`,
   so pushing both would hit a duplicate-key violation even after bug #1 was fixed.

## 2. Proposed Change

- **`supabase/migrations/20260226000001_rollback.sql`**: Wrap the unschedule in a
  PL/pgSQL block guarded on (a) the `cron` schema existing and (b) the
  `clean-receipts` job existing before calling `cron.unschedule()`. Mirrors the
  already-correct pattern in `20260226000004_rollback_receipt_cleanup.sql`.
- **Remove** the empty duplicate-version file
  `20260226000001_rollback_receipt_cleanup.sql`. The genuine receipt-cleanup
  rollback already exists as `20260226000004_rollback_receipt_cleanup.sql`.
- **Apply + record** migration `20260226000001` on the production database via the
  Supabase Management API query endpoint. Both statements are no-ops against the
  current schema (job and index already absent), so no data, indexes, or cron jobs
  were altered. `supabase db push --include-all` then reports nothing pending.

## 3. Data Flow / Contracts

No contract changes. No tables, columns, RLS policies, env vars, deployed services,
or start commands are altered. The migration only conditionally unschedules a cron
job (absent) and drops an index (absent) — both no-ops in the current state.

## 4. Security Impact

None. No changes to security modules, RLS policies, authentication, secrets, or
protected paths (`orchestrator/security/**`, `src/security/**`, `src/guardian/**`,
`src/zero-trust/**`).

## 5. Rollback Strategy

- Revert `20260226000001_rollback.sql` to its prior content to undo the guard
  (not recommended — re-introduces the non-idempotent `db push` failure).
- The migration is already recorded in `schema_migrations`; re-running it is safe
  because every statement is now idempotent.

## 6. Observability

CI signal is the source of truth: the "Deploy Supabase Edge Functions" job
transitions from failing to passing, and `supabase db push --include-all` reports
no pending migrations.

## 20. Architecture Review Checklist

- [x] No god object introduced
- [x] Domain boundary preserved
- [x] Cross-domain database writes avoided
- [x] Contracts documented (no contract change)
- [x] Rollback path defined
- [x] Observability defined
- [x] Failure modes defined (XX000 on missing cron job; PK collision on dup version)
- [x] Security impact reviewed (none)
- [x] Scope boundaries explicit
- [x] Follows §10 migration rules (additive/idempotent only; verified before apply)

## 21. Approval

Architecture Reviewer: APEX Platform / 2026-06-21
Operations Reviewer: APEX Platform / 2026-06-21
