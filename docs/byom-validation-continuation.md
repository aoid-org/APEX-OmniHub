# BYOM Connect AI — Validation Continuation Directive

Status as of this PR (branch `claude/byom-connect-ai-validation`, from `main`).

## What is PROVEN (local Supabase CLI stack only — no cloud project was ever touched)

Exercised the REAL edge-function code (`byom-login`, `byom-proxy`) via Deno against a
local `supabase start` stack (Docker Postgres + GoTrue + PostgREST), with a REAL Groq key
and a REAL outbound probe/inference to `api.groq.com`. Edge-runtime container could not
start in the sandbox (`rlimit type 7 operation not permitted`), so functions were run
directly with Deno — same source, same network, real DB writes.

- **All 89 migrations apply cleanly** (previously failed at 6+ points on a fresh DB).
- **byom-login positive** (real key): `status=success`, real Supabase session, synthetic
  `${fingerprint}@byom.local` user; rows written to `provider_connections`
  (encrypted bytea, `key_hint` 4-char only — no plaintext), `omnihub_model_registry`,
  and `audit_logs` (`byom.login`).
- **byom-login negative** (valid-format wrong key): real Groq 401 → `Invalid credential`,
  no session, no row written.
- **byom-proxy** (function half): real Groq streaming completion returned + `BYOM_AUDIT_SPAN`
  spend row written (`success | llama-3.1-8b-instant | cost ~0.00024`).

## DEFERRED (not yet done — pick up here)

1. **Phase B — production UI proof**: `bun run build` at repo root, serve `dist/`, drive
   `/login` → "Connect AI" modal → connect → redirect `/omnidash` with Playwright (real
   browser). Confirm `grep -r SUPABASE_SERVICE_ROLE_KEY dist/` returns nothing.
   Edge functions must be reachable from the browser — either get the edge-runtime
   container working, or run a gateway that routes `/functions/v1/*` to Deno-served
   functions and proxies the rest to Kong (`:54321`).
2. **Item #2 — test suites**: `npm test` (~2,480 vitest) and `npm run test:e2e`.
3. **Item #3 — cleanup**: `apps/omnihub-site` dead SSG `build`/`build:ssg` scripts
   (broken `vite-react-ssg` peer dep) vs missing `@omnihub/stores/*` tsconfig alias —
   pick ONE after grepping for actual SSG usage.

## CRITICAL FOLLOW-UPS / FINDINGS

- **Environment-parity (NOT in this PR, must be solved for fresh/CI bootstrap):** a clean
  stack lacks the platform default privileges prod has, so `service_role`/`authenticated`/
  `anon` had **no DML** on 87 migration-created tables. Locally fixed with
  `GRANT ALL ON ALL TABLES/SEQUENCES IN SCHEMA public TO anon, authenticated, service_role`
  + matching `ALTER DEFAULT PRIVILEGES FOR ROLE postgres`. Decide whether to add a
  bootstrap migration/seed so fresh environments are not broken.
- **Out-of-band drift:** 9+ tables are referenced by migrations but created by no migration
  (`omnidash_workflows`, `receipts`, `ingest_artifacts/dead_letters/parse_results`,
  `media_publications`, `product_media`, `usage_metering`, `health_checks`). They exist in
  prod but not in history → prod was built incrementally. Capture them as migrations.
- **Prod RLS check:** verify `omni_run_events` actually has an owner policy in prod
  (`select * from pg_policies where tablename='omni_run_events'`). On a clean history it is
  the OmniTrace text-keyed table; the OmniDash uuid policy silently never applies.
- **Migration-edit nuance:** the 6 in-place migration edits fix bugs that abort the apply
  itself (a later forward-fix migration would never be reached). The 2 new
  `20260621*` migrations fix runtime bugs and are proper forward-fixes.

## SECURITY

Groq key was used only for the live probe/inference and never printed in full, committed,
or screenshotted. **Revoke the throwaway Groq key now.** Service-role key stayed
server-side (Deno env) only; byom-login returns the user session, never the service key.
