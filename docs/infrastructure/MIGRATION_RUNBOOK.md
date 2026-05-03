<!-- APEX_DOC_STAMP: VERSION=v9.1 | LAST_UPDATED=2026-04-26 -->
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

