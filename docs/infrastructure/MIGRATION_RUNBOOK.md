<!-- APEX_DOC_STAMP: VERSION=v9.0 | LAST_UPDATED=2026-04-26 -->
# Migration Runbook: Lovable Cloud → Supabase + Cloudflare Pages

**Purpose:** Migrate legacy Lovable-backed deployments to Supabase + Cloudflare Pages with zero ambiguity.

## Pre-Migration Checklist

- [ ] Supabase project provisioned
- [ ] Supabase keys available (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`)
- [ ] Service credentials available for Edge Functions (`SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Cloudflare Pages project connected to GitHub repository
- [ ] Rollback owner assigned

## Step 1 — Apply Database Migrations

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Verify at minimum:
- `audit_logs`
- `device_registry`
- RLS enabled on protected tables

## Step 2 — Configure Environment Variables

### Local (`.env.local`)

```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
# Legacy fallback supported:
# VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Cloudflare Pages (Project Settings → Variables and Secrets)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (preferred)
- optional legacy fallback: `VITE_SUPABASE_ANON_KEY`
- any feature-specific `VITE_*` keys required by target environment

### Supabase Edge Functions

Set in Supabase Dashboard → Project Settings → Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Step 3 — Deploy Web App (Cloudflare Pages)

```bash
git push origin main
# Cloudflare Pages auto-builds from connected branch
```

Verify deployment in Cloudflare dashboard and capture deployment URL.

## Step 4 — Verify Migration

```bash
npm run smoke-test
npm run test:assets
```

Manual checks:
1. Authentication flow loads (no "service not configured" errors)
2. `/omnidash` is reachable post-auth
3. audit + registry writes succeed
4. edge functions that require JWT enforce JWT as configured in `supabase/config.toml`

## Rollback

### App rollback
```bash
git revert <migration-commit>
git push origin main
```

### DB rollback
Use migration repair and targeted rollback SQL under `supabase/migrations/rollback/`.

## Notes

- Any Vercel-specific instructions from older versions of this runbook are deprecated.
- Use `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` for current platform truth.

