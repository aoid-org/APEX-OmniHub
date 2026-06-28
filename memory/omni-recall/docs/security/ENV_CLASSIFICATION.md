---
title: Environment Variable Classification & Key Safety
created: 2026-06-28
status: active
ticket: APEX-RC-REMEDIATION (contract §6)
target_supabase_project: rtopreovkywofgwgmozi (ca-central-1)
rule: Privileged keys NEVER reach the browser bundle. VITE_* are build-time browser flags.
---

# Environment Variable Classification & Key Safety

Mandated by the remediation contract §6. Every variable is classified by where it
is read and what trust tier it carries. Privileged secrets must only ever be read
by Edge Function (server) runtime, never by client/browser code.

## Classification

| Variable | Class | Read by | Trust | Notes |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | build-time frontend | client (`src/lib/supabase*`) | public | baked into bundle at build |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | build-time frontend | client | public-safe | publishable key only; legacy fallback `VITE_SUPABASE_ANON_KEY` |
| `VITE_DASHBOARD_URL` | build-time frontend | client (`Layout.tsx`) | public | |
| `VITE_MAESTRO_ENABLED` | build-time frontend | client (`Layout.tsx`) | public flag | |
| `VITE_IS_DEMO_MODE` | build-time frontend | client (`OmniSpatialHost.tsx`) | public flag | |
| `OMNILINK_ENABLED` | Edge Function runtime | `omnilink-port` | server | feature gate |
| `ORCHESTRATOR_URL` | Edge Function runtime | `omnilink-port` (omniboard-*) | server | unset → honest 503 `connect_unavailable` |
| `ORCHESTRATOR_SHARED_SECRET` | Edge Function runtime | `omnilink-port/_shared` | **secret** | server-to-orchestrator auth |
| `SUPABASE_URL` | Edge Function runtime | edge `_shared` | server | |
| `SUPABASE_ANON_KEY` | Edge Function runtime | edge `_shared` | public-safe | RLS-scoped client in edge |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function runtime | edge `_shared` (admin ops) | **secret** | bypasses RLS — edge only, never browser |
| `ALLOWED_ORIGINS` / `ALLOWED_ORIGIN_REGEXES` | Edge Function runtime | `omnilink-port/_shared/cors.ts` | server | CORS allowlist |
| `OMNIBOARD_INLINE_FSM_FALLBACK` | Edge Function runtime | (reserved §5, not yet wired) | server flag | optional inline fallback gate |
| `OMNIBOARD_SESSION_SECRET` | Edge Function runtime | (reserved §5, not yet wired) | **secret** | HMAC session signing for fallback |
| `SONAR_TOKEN`, `NPM_CONFIG_*` | CI-only | GitHub Actions | secret/config | never in app |
| `E2E_SUPABASE_SERVICE_ROLE_KEY`, `E2E_USER_EMAIL/PASSWORD` | CI-only | Playwright global-setup | secret/test | test provisioning only |
| `APEX_ALLOW_MISSING_SUPABASE_CONFIG`, `APEX_E2E_BACKEND_REQUIRED`, `REQUIRE_SUPABASE_E2E` | local/CI test | test harness | config | gate backend-required E2E |

## Service-role key safety (proof)

Client code never reads a service-role key. The only references in the client tree
are **detection-and-rejection guards** that classify any service-role key/JWT as
`'secret'` and refuse it:

- `apps/omnihub-site/src/lib/supabaseConfig.ts:63` — rejects keys containing
  `service_role` or `sb_secret_` prefix.
- `apps/omnihub-site/src/lib/supabaseConfig.ts:71` — rejects JWTs whose
  `payload.role === 'service_role'`.

`SUPABASE_SERVICE_ROLE_KEY` is read exclusively by Edge Function runtime
(`supabase/functions/**/_shared`). VITE_* (build-time) carries only public-safe values.

`UNCERTAIN`: full built-bundle grep proof is deferred to Phase 18 deployed smoke
(grep `dist/**` for `service_role` / secret prefixes) — source-level audit above is
the current evidence.

## Service-role authorization rule (§6)

Where an Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` (RLS-bypassing), it must
manually enforce authenticated-user ownership + tenant scope before read/write/sign/
delete. RLS alone is insufficient when service_role bypasses it. (Audit of each
service-role call site to be completed alongside Phase 7 OmniMedia edge routes.)

## Build-time vs runtime caution

`VITE_*` flags are compiled into the browser bundle at build time → changing them
requires a rebuild + redeploy. Edge Function secrets are server runtime values set
in the Supabase dashboard (no `[functions.env]` block in `config.toml`). Do NOT
attempt to fix an Edge runtime issue by changing a `VITE_*` flag unless the affected
code actually reads it.
