<!-- APEX_DOC_STAMP: VERSION=v2.0 | LAST_UPDATED=2026-04-26 -->
# Production Deployment Guide (Cloudflare Pages + Supabase)

## Purpose
Operational checklist for production rollouts using Cloudflare Pages as web runtime and Supabase as data/edge runtime.

## 0) Required Gates Before Deploy

Run and pass:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:assets
npm run test:e2e
npm run test:infra
npm run lint:py
npm run test:py
```

## 1) Environment Validation

- Cloudflare Pages vars present (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- Supabase Edge Function secrets present (`SUPABASE_SERVICE_ROLE_KEY`, provider secrets as needed)
- Production-only secrets validated via security runbooks

Recommended pre-check:

```bash
node scripts/check-env-root.mjs
```

## 2) Database + Edge Runtime

```bash
supabase link --project-ref <prod-ref>
supabase db push
# Deploy only required functions
supabase functions deploy <function-name>
```

## 3) Web Deployment (Cloudflare Pages)

- Merge approved PR into deployment branch.
- Confirm Cloudflare Pages build succeeded.
- Validate deployed URL + headers + routing.

## 4) Post-Deploy Validation

```bash
npm run smoke-test
npm run test:assets
```

Also verify:
- auth/login journey
- `/omnidash` post-auth shell
- critical edge-function flows
- orchestrator health endpoints where applicable

## 5) Rollback Strategy

1. Revert deployment commit and redeploy via Cloudflare Pages.
2. If schema caused impact, apply matching rollback migration from `supabase/migrations/rollback/`.
3. Trigger incident process in `docs/ops/INCIDENT_RESPONSE.md`.

## 6) Legacy Notice

This guide supersedes prior Vercel-centric deployment instructions.

