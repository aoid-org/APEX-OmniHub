<!-- APEX_DOC_STAMP: VERSION=v9.1 | LAST_UPDATED=2026-05-20 -->
# Migration Runbook: Lovable Cloud → Supabase + Cloudflare Pages

**Purpose:** Step-by-step migration guide with explicit validation and rollback points.

---

## 0) Migration Owners and Change Window

- Assign migration owner
- Assign rollback owner
- Define validation sign-off owner
- Define freeze window for non-migration changes

---

## 1) Pre-Migration Checklist

- [ ] Supabase project provisioned
- [ ] Supabase keys available (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` or fallback anon)
- [ ] Edge function service credentials ready (`SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Cloudflare Pages project connected to repository
- [ ] Rollback strategy approved

---

## 2) Database Migration

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### Verify
- [ ] `audit_logs` table present
- [ ] `device_registry` table present
- [ ] RLS enabled on protected tables

---

## 3) Environment Configuration

### Local (`.env.local`)

```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
# Optional legacy fallback:
# VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Cloudflare Pages
Set in Project Settings → Variables and Secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- optional legacy fallback: `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Functions
Set in Supabase Dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 4) Deploy Web Runtime

```bash
git push origin main
```

Cloudflare Pages should auto-build from connected branch.

### Verify deployment
- [ ] build succeeds
- [ ] env vars injected
- [ ] app routes load

---

## 5) Functional Validation

```bash
npm run smoke-test
npm run test:assets
```

Manual checks:
1. Auth loads with no configuration errors
2. `/omnidash` reachable post-auth
3. Audit/device writes succeed
4. JWT-protected functions enforce JWT correctly

---

## 6) Rollback

### App rollback
```bash
git revert <migration-commit>
git push origin main
```

### DB rollback
- Use `supabase/migrations/rollback/` scripts
- Apply repair/revert as appropriate

---

## 7) Legacy Context

Historical, longer migration narrative retained in:
`docs/archive/legacy-runbooks/MIGRATION_RUNBOOK_legacy.md`.

---

## Migration Log — Supabase Production Fixes (2026-05-04)

**Branch:** `claude/apex-omnihub-supabase-fixes-RnSc6`  
**Operator:** Claude Code (automated, MCP-driven)  
**Project:** APEX-OmniHub production Supabase (`rtopreovkywofgwgmozi`)  
**Date:** 2026-05-04  

### Migrations Applied (in order)

| # | Migration File | Version Timestamp | Description |
|---|---|---|---|
| 1 | `20260417000000_omnibridge_events.sql` | 20260417000000 | OmniBridge v1.6.0 persistence layer — omnibridge_events, omnibridge_events_dlq, omnibridge_control_audit, omnibridge_event_stats_hourly view. Corrected app_role enum (removed super_admin/operator). |
| 2 | `20260426000000_fix_security_advisor_findings.sql` | 20260426000000 | Security Advisor ERRORs: security_invoker on 2 views, RLS + service_role policy on 10 public tables. |
| 3 | `20260504000000_security_hardening_functions_rls.sql` | 20260504000000 | **NEW** — fixed 4 mutable search_path WARNs, revoked anon from 32 SECURITY DEFINER functions, added admin_claim_secrets RLS policy. |
| 4 | `20260504000001_fk_indexes_performance.sql` | 20260504000001 | **NEW** — 14 FK covering indexes for performance advisor findings. |
| 5 | `20260504000002_fix_omnibridge_view_security_invoker.sql` | 20260504000002 | **NEW** — Fixed `omnibridge_event_stats_hourly` view: `SET (security_invoker = true)`. Found by post-migration advisor verification. |

### Pre-Migration State
- 12 Security Advisor ERRORs (2 SECURITY DEFINER view ERRORs + 10 rls_disabled_in_public)
- 60+ Security Advisor WARNs (anon/authenticated SECURITY DEFINER function exposure + mutable search_path)
- 1 rls_enabled_no_policy WARN on admin_claim_secrets
- 14 Performance Advisor INFO findings (unindexed foreign keys)
- omnibridge_events tables not yet in production (v1.6.0 blocker)

### Post-Migration State
- 0 Security Advisor ERRORs
- ~0 WARNs for anon fn exposure, mutable search_path, rls_no_policy
- 0 Performance unindexed FK findings
- omnibridge_events, omnibridge_events_dlq, omnibridge_control_audit live in production

### Rollback Notes
- Migrations 3 and 4 are fully reversible (GRANT/REVOKE and DROP INDEX IF EXISTS).
- Migration 2 RLS changes are reversible with ALTER TABLE ... DISABLE ROW LEVEL SECURITY (test impact before doing so).
- Migration 1 tables can be dropped; omnibridge code will fail gracefully (edge function returns 500).

### Validation Performed
- [x] All migrations applied via Supabase MCP (no manual SQL)
- [x] provider_connections underlying table has existing authenticated SELECT policy — view security_invoker change safe
- [x] armageddon code uses service_role key — RLS table changes safe
- [x] No frontend authenticated queries broken (grep verified zero direct queries to newly-RLS-locked tables from app src)
- [x] 14 FK indexes created as IF NOT EXISTS (idempotent, zero downtime)

