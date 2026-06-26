# Production Certification Bridges — 2026-06-26

## Scope
Surgical hardening for OmniBoard, Automations, Billing, and PWA deploy proof.

## Decisions
- OmniBoard remains the only third-party app integration surface; proxy routes continue through `omnilink-port/omniboard-start` and `omnilink-port/omniboard-next`.
- Automations execute only `execute-automation` for exactly one selected live UUID. Demo/static IDs such as `auto-lead` fail closed in UI copy and are never sent to the Edge Function.
- Billing actions call the authenticated `create-billing-portal` Edge Function and redirect only to a returned `https://billing.stripe.com/...` URL. No mailto, alert, or hardcoded billing domains are valid production actions.
- PWA certification now checks source and built `dist/` artifacts, and deployed smoke checks include manifest, service worker, bundle registration, and OmniBoard edge-route reachability.

## Validation Notes
- Local typecheck, PWA guard, OmniDash guard, targeted Vitest suite, production build, and Cloudflare Pages contract passed.
- Live deployed bundle smoke could not complete from the container because Node `fetch` failed against the production domain while `curl -I https://apexomnihub.icu` returned 200. CI/deploy guard remains deterministic once run in the deploy environment.

## CI Follow-up — deploy smoke failure
- Root cause: deployed-bundle smoke used Node `fetch`, which does not honor proxy env in containerized validation, and the production OmniBoard Edge route was still the previously deployed function returning `404` because Cloudflare Pages deploy did not publish the changed Supabase functions first.
- Fix: `verify-deployed-bundle.mjs` now falls back to `curl` for proxy-constrained fetches, and the governed production deploy workflow publishes `omnilink-port` + `create-billing-portal` before running live deployed smoke.
- Regression: `tests/runtime-production-hardening.spec.ts` now gates the Edge deploy ordering and curl fallback source contract.

## CI Follow-up — Ops Doc Guard failure
- Root cause: the production hardening PR changed deployed runtime contracts (`.github/workflows/**`, `supabase/functions/**`, `supabase/config.toml`) without updating `docs/APEX_AGENT_OPERATIONS.md`, so `ops-doc-guard.yml` failed on the PR.
- Fix: `docs/APEX_AGENT_OPERATIONS.md` now records the `omnilink-port` and `create-billing-portal` Edge services, deploy commands, smoke expectations, and required `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF` workflow secrets.

## CI Follow-up — Bun frozen lockfile failure
- Root cause: `package.json` / `package-lock.json` already included dependency changes (`supabase`, `@axe-core/playwright`), but `bun.lock` was stale. CI uses `bun install --frozen-lockfile --ignore-scripts`, so Release and runtime gates failed before tests.
- Fix: regenerated `bun.lock` with Bun 1.3.14 using `npm exec --package=bun@1.3.14 -- bun install --ignore-scripts`, then verified frozen install with the same Bun version.
