# APEX-OmniHub Production Validation Harness — 2026-06-26

## Executive decision boundary

This harness supports a truthful production-certification decision for `https://apexomnihub.icu`. It is intentionally non-destructive by default. It does **not** certify production by its existence; each release-critical item is certified only when the matrix item is `VERIFIED` with retained evidence.

Current recommendation: **NO-GO for claiming fully certified production functionality** until Cloudflare provenance, authenticated workflows, Request Access persistence/fallback proof, Supabase RLS, BYOM, billing, mobile/device, performance/load, and branch protection are verified with live evidence.

## Preflight access/safety matrix

| Area | Classification | Safety boundary |
| --- | --- | --- |
| Cloudflare deployment/env | RUNNABLE_WITH_ENV_VARS | Read-only Cloudflare token/account/project evidence required. |
| Public browser routes | RUNNABLE_NOW | `npm run test:e2e:production-safe` only visits routes and captures sanitized evidence. |
| Request Access | RUNNABLE_WITH_ENV_VARS | No production write unless explicitly allowed with test-only data and backend proof. |
| Auth email/password | REQUIRES_OWNER_CREDENTIALS | Requires dedicated test account; never record tokens/cookies. |
| OAuth | REQUIRES_OWNER_CREDENTIALS | Requires provider sandbox/test account and callback evidence. |
| Passkey/WebAuthn | REQUIRES_MANUAL_DEVICE_OR_PROVIDER | Requires real device authenticator/security key. |
| OmniDash persistence | REQUIRES_OWNER_CREDENTIALS | Repo guardrails are local; live persistence needs backend read-back. |
| Supabase RLS/multi-tenant | RUNNABLE_WITH_ENV_VARS | Requires two tenant users and least-privilege validation; service role only server-side if approved. |
| BYOM | RUNNABLE_WITH_ENV_VARS | Requires sandbox provider key and redaction evidence. |
| Billing/payment | RUNNABLE_WITH_ENV_VARS | Sandbox/test payment credentials only. |
| PWA/mobile | RUNNABLE_NOW | Web viewport/manifest smoke is runnable; native install/device remains manual. |
| Performance/load | BLOCKED_BY_ENVIRONMENT unless k6 exists | `npm run perf:k6:smoke` must execute; skipped k6 is not a pass. |
| Branch protection/release gates | REQUIRES_OWNER_CREDENTIALS | GitHub settings/ruleset evidence requires owner/admin access. |

## Runnable commands

```bash
APEX_PROD_URL=https://apexomnihub.icu npm run test:e2e:production-safe
npm run release:validation-matrix
npm run verify:ci-integrity
npm run perf:k6:smoke
npm run check:pwa
npm run test -- tests/omnidash/useOmniDashAction.spec.tsx tests/omnidash/fake-success-guardrails.spec.tsx
```

## Evidence policy

Generated evidence lives under `artifacts/production-validation/` and must be sanitized before sharing. Evidence must not contain bearer tokens, cookies, service-role keys, private emails, payment data, raw auth headers, provider API keys, or private user data.

## Cloudflare deployment/env

Owner evidence must include production deployment ID, deployed commit/bundle provenance, required public env variable presence, forbidden service-role/secret absence from the client bundle, source-map exposure decision, and DNS/domain binding to the expected Cloudflare Pages project.

## Production-safe browser routes

The Playwright production-safe suite captures desktop/mobile screenshots, final URL, title, visible product signal, console/page errors, failed requests, 4xx/5xx responses, and route classification for `/`, `/login`, `/request-access`, `/demo`, and `/omnidash`. Auth-gated `/omnidash` is acceptable only when it gates clearly; blank screens, raw errors, misleading success, or generic failure text are failures.

## Request Access proof

Preferred certification requires a clearly marked test-only submission and backend row proof or explicitly verified mailto fallback. UI success alone is not persistence proof. If backend credentials are unavailable, classify as `HONESTLY_GATED` or `REQUIRES_MANUAL_VALIDATION`.

## Auth, OAuth, and passkey

Certification requires dedicated test accounts/provider sandboxes and redacted evidence for valid login, invalid login error behavior, logged-out protected-route behavior, OAuth redirect/callback persistence, and WebAuthn registration/assertion on a real authenticator.

## OmniDash persistence

Repo-local guardrails require local-only launches to remain `LOCAL_LAUNCHED` and never backend-confirmed `LIVE` without persistence/read-back. Live certification requires authenticated action execution, reload, backend read-back, and sanitized metadata with no secrets.

## Supabase RLS / multi-tenant

Owner-run validation must prove tenant A cannot read or mutate tenant B rows, unauthenticated users cannot access protected rows, service-role keys are never exposed to browser tests, and claimed audit/log records are created.

## BYOM / provider key handling

Owner-run validation must prove invalid key failure, sandbox-key success, UI/network/console/storage redaction, and absence of provider keys from screenshots/traces/reports. Disabled BYOM is `HONESTLY_GATED`, not passed.

## Billing / payment

If billing is release scope, only sandbox/test credentials may be used. Evidence must cover checkout start, failed payment behavior, successful sandbox payment, cancellation/refund/entitlement transition, webhook receipt, and persisted subscription state.

## PWA / mobile

Web validation covers manifest/icons/service-worker/mobile viewport smoke. Native Android/iOS certification requires device or emulator screenshots, install/open evidence, signed build provenance, and offline behavior only if claimed.

## Performance/load

`npm run perf:k6:smoke` is the safe production profile: one virtual user for a short read-only homepage smoke with thresholds for error rate, p95, p99, and checks. If k6 is missing, performance is `BLOCKED`, not passed.

## GitHub branch protection / release gates

Owner evidence must show required checks/rulesets for protected branches, dependency automation cannot merge failed checks, and release workflows reference the release validation matrix or equivalent required gate.
