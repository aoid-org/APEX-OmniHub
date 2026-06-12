## Contents

1. Trust Model Overview
2. Pre-Write Checklist
3. RLS Enforcement Protocol
4. Credential Security Rules
5. Migration Safety Rules
6. Failsafe Triggers
7. Security Audit Checklist
8. Contingency Plans

---

## 1. Trust Model Overview

APEX-OmniHub enforces zero-trust at every data boundary. No component is trusted by
default — trust is always earned through verification at each layer.

Trust tiers:
```
UNTRUSTED — any public endpoint, any client-side code, any unverified input
VERIFIED  — passes RLS, authenticated via Supabase Auth or BYOM key fingerprint
ELEVATED  — service-role key (Supabase) — backend only, never in client bundles
SYSTEM    — Temporal.io workers, edge functions with server context
```

The model: every operation is untrusted until explicitly verified.
Default posture: DENY → verify → ALLOW (never ALLOW → detect → DENY).

---

## 2. Pre-Write Checklist

Run every item before executing any write to any APEX data store:

```
[ ] apex_db_rls_check [table] → confirms RLS policy active on target table
[ ] Auth context confirmed — request carries valid Supabase JWT or BYOM fingerprint
[ ] Service-role key confirmed absent from client-side code path
[ ] Migration is additive — no column drops, no table drops, no policy removals
[ ] Health gate passed — apex_platform_health returns healthy
[ ] No credential exposure in recent apex_gh_file reads (credential scan)
[ ] Blast radius documented — list every table / function touched
```

If any item is unchecked: do not proceed. Resolve the item or escalate to P1.

---

## 3. RLS Enforcement Protocol

Row Level Security is non-negotiable on these tables:

```
users        — per-user isolation mandatory
clients      — per-tenant isolation mandatory
payments     — per-user + per-tenant isolation mandatory
skill_registry — read access by role
audit_log    — append-only; no delete policy; no update policy
module_states — read by system; write by Guardian only
```

How to verify: `apex_db_rls_check [table_name]`
How to check all: `apex_db_rls_check` (no argument = all tables)

Remediation if RLS missing:
```
1. HARD STOP on all writes to that table
2. Create additive migration: ALTER TABLE [t] ENABLE ROW LEVEL SECURITY;
3. Add per-tenant/per-user policy in same migration
4. apex_db_migrations → confirm migration applied
5. apex_db_rls_check [table] → confirm policy active
6. Log incident in apex_audit_log before resuming writes
```

---

## 4. Credential Security Rules

APEX uses these credential types — each has a specific scope and revocation path:

| Credential | Scope | Never in | Revoke at |
|-----------|-------|---------|-----------|
| Supabase anon key | Client-side read | DB write ops | supabase.com/dashboard/project/[id]/settings/api |
| Supabase service-role key | Backend only | Any client bundle | supabase.com/dashboard/project/[id]/settings/api |
| GitHub PAT | Repo access | Frontend code | github.com/settings/tokens |
| Cloudflare API token | CF management | Git history | dash.cloudflare.com/profile/api-tokens |
| APEX_MCP_CONNECTOR_TOKEN | MCP gateway auth | Public URLs | Redeploy with new env var |
| BYOM key fingerprint | API identity | Plaintext storage | byom-login edge fn re-registration |

Detection trigger: any string matching pattern `[A-Za-z0-9_-]{30,}` in apex_gh_file that
appears in context resembling a key assignment (e.g., `key:`, `token:`, `secret:`, `=`) →
treat as credential exposure until ruled out.

Action on detection:
```
1. HARD STOP — do not proceed, do not use the credential
2. Emit: SECURITY_FLAG: potential credential at [file path]:[line number]
3. Verify type from pattern (service-role, PAT, CF token, etc.)
4. Provide exact revocation URL for the credential type
5. Log event in apex_audit_log: credential exposure detected
6. Do not resume work until user confirms rotation
```

---

## 5. Migration Safety Rules

Database migrations are irreversible in production. These rules are absolute:

```
RULE 1 — Always additive
  ADD COLUMN, CREATE TABLE, CREATE INDEX, CREATE POLICY are safe.
  DROP COLUMN, DROP TABLE, ALTER COLUMN (type change) are destructive = HARD STOP.

RULE 2 — RLS in same migration
  Any new table must have ENABLE ROW LEVEL SECURITY + at least one policy
  in the same migration file. Never create a bare table.

RULE 3 — No data transforms in migrations
  Data backfills belong in separate, idempotent scripts — not in .sql migrations.
  Mixing them makes rollback impossible.

RULE 4 — Verify before and after
  Before: apex_db_migrations → confirm current migration sequence
  After:  apex_db_migrations → confirm new migration applied cleanly
  After:  apex_db_rls_check → confirm all policies still active

RULE 5 — Naming convention
  Migration files: YYYYMMDDHHMMSS_description_snake_case.sql
```

---

## 6. Failsafe Triggers

These conditions immediately halt all operations — no rationalization accepted:

```
FAILSAFE 1 — RLS disabled on critical table
  Trigger: apex_db_rls_check returns "rls_enabled: false" for users/clients/payments
  Action:  HARD STOP → P0 escalation → remediate RLS → health gate → resume

FAILSAFE 2 — Service-role key in client bundle
  Trigger: service_role key pattern found in src/ files via apex_gh_file
  Action:  HARD STOP → SECURITY_FLAG → revoke immediately → rotate secrets

FAILSAFE 3 — Production write without health gate
  Trigger: Any attempt to write production data before apex_platform_health = healthy
  Action:  HARD STOP → run health gate first → resolve any unhealthy signal

FAILSAFE 4 — Destructive migration without approval
  Trigger: DROP, TRUNCATE, ALTER COLUMN (breaking) in migration proposal
  Action:  HARD STOP → present impact analysis → require explicit written approval

FAILSAFE 5 — Credential exposure in repository
  Trigger: Key/token pattern found in apex_gh_file response
  Action:  HARD STOP → SECURITY_FLAG → revocation URLs → await rotation confirmation

FAILSAFE 6 — Module writes to production while Tri-Force degraded
  Trigger: apex_module_states shows any module OFFLINE during write operation
  Action:  HARD STOP → restore module health first → re-verify → resume
```

---

## 7. Security Audit Checklist

Run when performing a full security audit (`apex_audit_log` + `apex_db_rls_check`):

```
Database
[ ] RLS enabled on all tables (apex_db_rls_check)
[ ] No service-role key references in src/ (apex_gh_search "service_role")
[ ] All migrations are additive (apex_db_migrations review)
[ ] audit_log has no delete or update policies

Edge Functions
[ ] Each function validates auth header before any data access
[ ] CORS origin from env var, not hardcoded (known past bug: aSpiral)
[ ] No plaintext credentials in function source

Frontend
[ ] Only anon key in client-side code
[ ] No API keys in .env files committed to git
[ ] auth routes behind Supabase Auth guard

CI/CD
[ ] apex_policy_check.py gate in ci.yml
[ ] Secrets stored in GitHub Actions secrets, not in yaml files
[ ] Branch protection on main: requires PR + CI pass

Platform
[ ] APEX_READ_ONLY=true on MCP connector (default safe)
[ ] MCP connector token rotated if ever exposed
[ ] Cloudflare WAF active on production domain
```

---

## 8. Contingency Plans

| Threat | Immediate Response | Recovery |
|--------|-------------------|---------|
| Credential leaked in PR | HARD STOP · revoke at provider · push fix commit removing credential · audit git history | Rotate all co-located secrets; scan git history with truffleHog pattern |
| RLS disabled by migration | HARD STOP writes · additive migration to re-enable · health gate | Root-cause which migration removed policy; add CI check to prevent recurrence |
| Unauthorized data access | apex_audit_log → identify scope · apex_db_rls_check all tables | Freeze affected tenant data; forensic audit; notify affected client |
| MCP token compromised | Change APEX_MCP_CONNECTOR_TOKEN env var · redeploy connector | Update URL in Claude settings; rotate all adjacent secrets |
| Service-role key in bundle | Remove from bundle immediately · rotate Supabase service key | Audit for any unauthorized queries during exposure window |
