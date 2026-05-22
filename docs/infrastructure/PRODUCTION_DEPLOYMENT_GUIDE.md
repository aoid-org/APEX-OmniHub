<!-- APEX_DOC_STAMP: VERSION=v2.1 | LAST_UPDATED=2026-05-20 -->
# Production Deployment Guide (Cloudflare Pages + Supabase)

## Purpose
Operational playbook for production rollouts with strong readability for new operators and strong execution fidelity for experienced teams.

## Scope
- Web deployment: Cloudflare Pages
- Data + edge runtime: Supabase
- Orchestrator: Temporal Python service (where enabled)

---

## 0) Pre-Deploy Readiness Gates

Run and pass locally (or validate in CI):

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

### Cloudflare Pages variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (preferred)
- optional legacy fallback: `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Function secrets
- `SUPABASE_SERVICE_ROLE_KEY`
- provider-specific credentials (web3, payment, BYOM, etc.)

Recommended pre-check:

```bash
node scripts/check-env-root.mjs
```

---

## 2) Database and Function Deployment

```bash
supabase link --project-ref <prod-ref>
supabase db push
supabase functions deploy <function-name>
```

### Verification checklist
- [ ] migrations applied without error
- [ ] required tables present
- [ ] function auth mode matches `supabase/config.toml`
- [ ] secrets resolved in runtime logs

---

## 3) Web Deployment (Cloudflare Pages)

1. Merge approved PR into deployment branch.
2. Confirm Cloudflare Pages build success.
3. Validate routing + headers + env var injection.

### Quick verification
- [ ] landing route returns 200
- [ ] login/auth route renders
- [ ] `/omnidash` accessible post-auth

---

## 4) Post-Deploy Validation

```bash
npm run smoke-test
npm run test:assets
```

Operational checks:
- [ ] critical edge functions healthy
- [ ] key user journeys pass (auth, dashboard, primary workflows)
- [ ] no severe errors in telemetry/logging window after deploy

---

## 5) Rollback Strategy

### Fast rollback
1. Revert deployment commit.
2. Push revert.
3. Confirm Cloudflare Pages rollback deployment.

### Data rollback
- Use rollback SQL under `supabase/migrations/rollback/`.
- Execute incident process if customer-impacting.

Reference: `docs/ops/INCIDENT_RESPONSE.md`

---

## 6) Operator Notes

- This guide prioritizes current topology and practical run steps.
- Deep historical deployment context is preserved in:
  `docs/archive/legacy-runbooks/PRODUCTION_DEPLOYMENT_GUIDE_legacy.md`.

