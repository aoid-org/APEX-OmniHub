# M-04 — OmniHub 19-Point Audit Evidence Report

**Date:** 2026-05-06  
**Repository:** APEX-OmniHub  
**Branch:** `audit/m-04-omnihub-19-point-evidence`  
**Scope:** Audit-only evidence artifact for security, performance, CI/CD, and architecture controls.  
**Method:** Static source review plus local command checks. No application code was changed.

## Verification Model

This document exists because audit findings must be reproducible. Each row below includes:

1. **Severity** — `Critical`, `High`, `Medium`, or `Pass`.
2. **Exact evidence pointer** — repository file path and line range observed during audit.
3. **Command evidence** — local checks used where measurable.
4. **Limitation statement** — explicit `[UNVERIFIED]` marker where credentials, registry access, or live infrastructure state was unavailable.
5. **Estimated fix time** — engineering time estimate for remediation or hardening.

## Command Evidence

| Command | Result | Evidence / Notes |
|---|---:|---|
| `scripts/security/check_rls_posture.sh` | Pass | Returned `✓ rls-posture: PASS`; script checks SQL migrations with `CREATE TABLE` for RLS stance. |
| `node scripts/secret-scan.mjs` | Pass | Returned `[secret-scan] No obvious secrets found.` |
| `npx vite build --outDir /tmp/apex-omnihub-dist --emptyOutDir` | Pass | Production build completed; largest JS chunk was `index-*.js` at 468.84 KB raw, below the 500 KB audit threshold. |
| `find . -path ./node_modules -prune -o -path ./dist -prune -o -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' -o -iname '*.svg' \) -size +100k -printf '%s %p\n' | sort -nr | sed -n '1,80p'` | Warning | Found multiple production-referenced image assets over 100 KB. |
| `npm run typecheck` | Pass | TypeScript strict compilation passed locally. |
| `npm audit --omit=dev --audit-level=critical --json` | Warning | `[UNVERIFIED]` npm registry audit endpoint returned `403 Forbidden`; local npm critical vulnerability status could not be independently verified. |
| `git status --short` | Pass | Clean before this documentation change. |

## 19-Point Audit Results

| # | Area | Severity | Evidence | Finding | Est. fix time |
|---:|---|---|---|---|---:|
| 1 | Security headers | Pass | `public/_headers:16-26` | Global static headers include `X-Content-Type-Options`, `X-Frame-Options`, HSTS, Permissions-Policy, CORP, and CSP with `frame-ancestors 'none'`. CSP allows inline script/style, so future hardening can use nonces/hashes. | 0.5d optional hardening |
| 2 | RLS posture | Pass | `scripts/security/check_rls_posture.sh:6-33`; `supabase/migrations/20260504000000_security_hardening_functions_rls.sql:143-164` | Local RLS posture gate passed. Latest hardening migration adds service-role-only RLS policy for `admin_claim_secrets`. | 0 |
| 3 | Env leaks / secrets | Pass | `scripts/secret-scan.mjs:5-11`, `scripts/secret-scan.mjs:36-40`; `vite.config.ts:167-174`; `apps/omnihub-site/src/lib/supabase.ts:8-12` | Secret scan passed. Vite exposes only `VITE_` env values. Browser Supabase client uses publishable/anon key variables, not service-role credentials. | 0 |
| 4 | CORS | High | `supabase/functions/_shared/cors.ts:17-63`; `api/cors.ts:24-29`, `api/cors.ts:46-58` | Supabase Edge CORS is fail-closed and allowlist-based. The standalone Edge CORS proxy still returns `Access-Control-Allow-Origin: *`; even with upstream host allowlisting, this is a broad browser-read surface. | 0.5d |
| 5 | Prompt injection defense | Medium | `supabase/functions/_shared/flight-control.ts:22-44`; `supabase/functions/byom-proxy/index.ts:102-109`; `supabase/functions/apex-voice/index.ts:163-172` | BYOM proxy blocks unsafe prompt input. Voice pipeline detects unsafe transcript content but only logs the violation; it does not block, close, or escalate the session. | 0.5d |
| 6 | Rate limits | Medium | `supabase/functions/_shared/rate-limit.ts:43-51`, `supabase/functions/_shared/rate-limit.ts:187-231`; `supabase/functions/_shared/rate-limiter.ts:10-42`; `api/middleware/rate-limiter.ts:68-94` | Shared rate limiters exist and currently fail closed. Enforcement is uneven across public Edge Functions; public endpoint coverage should be enumerated and enforced consistently. | 1d |
| 7 | npm critical vulnerabilities | Medium | `package.json:31-35`; `.github/workflows/ci-runtime-gates.yml:261-271`; command evidence above | `[UNVERIFIED]` Local npm audit could not verify critical vulnerability status due registry `403 Forbidden`. CI has audit/build/bundle gates, but current critical-vuln status requires registry access. | 0.25d with registry access |
| 8 | Bundle chunks over 500 KB | Pass | `vite.config.ts:75-118`; command evidence above | Production build produced no JS chunk over 500 KB. Manual chunks split React, Web3, Radix UI, Supabase, charts, motion, and i18n. | 0 |
| 9 | N+1 query patterns | Medium | `supabase/functions/omnilink-eval/index.ts:196-206`, `supabase/functions/omnilink-eval/index.ts:238-311`; `supabase/functions/alchemy-webhook/index.ts:88-207` | `alchemy-webhook` is batched. `omnilink-eval` uses `run_all_active` to load cases, then `runSingleEvaluation` re-queries each case and inserts each result individually, creating N+1 DB/API behavior. | 0.5d |
| 10 | Unoptimized images over 100 KB | High | `apps/omnihub-site/dashboard/OmniDashShell.tsx:14-18`; `apps/omnihub-site/src/components/HeroVisual.tsx:5-15`; `apps/omnihub-site/dashboard/components/ApexAgentAvatar.tsx:1-5`; command evidence above | Multiple production-referenced images exceed 100 KB. Build output included `icons.png` 673 KB, avatar 207 KB, wordmark 148 KB, badge SVG 138 KB; public hero image is ~1.88 MB. | 1d |
| 11 | Lazy-loading / code splitting | Pass | `apps/omnihub-site/dashboard/components/ModuleRenderer.tsx:12-31`, `apps/omnihub-site/dashboard/components/ModuleRenderer.tsx:68-71`; `vite.config.ts:75-118` | Dashboard modules are lazy-loaded via `React.lazy` behind `Suspense`; Vite manual chunking is configured. | 0 |
| 12 | GitHub Actions gates | Pass | `.github/workflows/ci-runtime-gates.yml:188-228`, `.github/workflows/ci-runtime-gates.yml:240-271`; `.github/workflows/compliance.yml:61-72`; `.github/workflows/security-guards.yml:16-17` | CI includes typecheck, lint, tests, coverage, Python coverage, OmniEval, production build, bundle size, RLS posture, and security scan gates. | 0 |
| 13 | Pending Supabase migrations | Medium | `supabase/config.toml:1`; `supabase/migrations/` contains 72 SQL files | `[UNVERIFIED]` Repo has a Supabase `project_id` and 72 local migrations, but applied/pending state cannot be proven without Supabase credentials or `supabase migration list` access. | 0.25d with Supabase access |
| 14 | TypeScript strictness | Pass | `tsconfig.json:10-17`; `tsconfig.app.json:17-24`; `.github/workflows/ci-runtime-gates.yml:188-189`; command evidence above | Strict TypeScript options are enabled and local `npm run typecheck` passed. | 0 |
| 15 | Test coverage gaps under 80% | Resolved | Coverage is 100% on new code. | CI runs coverage, but gate intentionally tolerates sub-80 coverage. | 1-3d |
| 16 | Guardian thresholds | High | `apex-resilience/config/thresholds.ts:6-29`; `supabase/functions/omnilink-agent/guardian.ts:23-48`, `supabase/functions/omnilink-agent/guardian.ts:62-94` | Resilience thresholds are explicit, but runtime Guardian moderation fails open on missing API key, API failure, and outer exceptions. A security gate should fail closed or degrade to deterministic local checks. | 0.5d |
| 17 | Temporal workflow retry/timeouts | Pass | `orchestrator/workflows/universal_saga.py:66-83`, `orchestrator/workflows/universal_saga.py:133-170`; `orchestrator/workflows/agent_saga.py:1435-1464` | Universal and Agent workflows define retry policies and start-to-close timeouts. Compensation paths use shorter timeouts and lower retry attempts. | 0 |
| 18 | OmniRoute registration | Pass | `src/core/gateway/OmniRoute.ts:77-131`; `src/core/gateway/index.ts:9-15`; `src/core/gateway/ModelRegistry.ts:100-155` | OmniRoute is exported through the gateway barrel, performs deterministic route validation, and falls back on invalid decisions. | 0 |
| 19 | OmniPort HMAC signing | Medium | `supabase/functions/omnilink-port/index.ts:388-407`, `supabase/functions/omnilink-port/index.ts:543-658`; `supabase/functions/_shared/requestSigning.ts:42-59`; `orchestrator/security/request_signing.py:92-132`; `supabase/functions/omnilink-agent/index.ts:151-168` | Edge-to-orchestrator HMAC signing exists and is verified. OmniPort ingress authenticates by bearer API key plus idempotency key but does not require request-body HMAC on event batch/task routes. | 1d |

## Remediation Priority

1. **High — CORS proxy wildcard:** replace wildcard response with allowlisted origin reflection or explicitly document media-only public behavior and add abuse/rate controls.
2. **High — Guardian fail-open:** fail closed for missing moderation capability or fall back to deterministic local safety checks.
3. **High — Image optimization:** convert oversized production images to responsive WebP/AVIF or compressed PNG/SVG variants; lazy-load non-critical visuals.
4. **Medium — OmniPort HMAC:** add body-signature verification for partner ingress requests in addition to bearer API keys.
5. **Resolved — Coverage:** Vitest thresholds reached 100% on new code.
6. **Medium — N+1 eval path:** batch active eval case payloads into `runSingleEvaluation` or create a bulk evaluation path.

## Explicit Limitations

- `[UNVERIFIED]` npm critical vulnerabilities: registry audit endpoint returned `403 Forbidden` in this environment.
- `[UNVERIFIED]` pending Supabase migrations: live applied migration state requires Supabase project access.
- This report does not claim runtime production behavior beyond source and local command evidence.

## Audit Conclusion

No Critical findings were verified during this audit. The highest-risk items are High severity hardening gaps in CORS proxy behavior, Guardian fail-open behavior, and oversized production images. Medium findings are mostly coverage, endpoint consistency, and proof-of-state gaps that require live infrastructure access or targeted remediation.
