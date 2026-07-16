---
version: 1.8.3
last_audited: 2026-07-16
status: verified
scope: APEX-OmniHub platform baseline & Sprint APEX-HARDEN-2026-07-16-r3 completion
---

# APEX-OmniHub Current Platform State — 2026-07-16 Baseline

This document provides the authoritative, git-verified snapshot of the **APEX-OmniHub** repository following the complete execution and verification of the Security & Reliability Hardening Sprint (`APEX-HARDEN-2026-07-16-r3`).

---

## 1. Executive Summary & Audit Verification

- **Baseline Commit:** `8bcda913e6d877e62a129ef66ebcd8ec532f7823` (with 10 surgical tracked file modifications and 2 new infrastructure test files, plus unified documentation synchronization).
- **Release Line:** `1.8.3` (`package.json`), App package (`apps/omnihub-site/package.json`): `1.3.10`.
- **Execution Model:** TDD-first, zero breaking changes to existing behavior (strictly preserving `GlobalCanvas/DraggableWidget.tsx` drag-and-drop), zero new paid infrastructure or recurring manual steps.

---

## 2. Git-Verified Repository Statistics (2026-07-16)

| Metric | Verified Count | Verification Command / Notes |
|---|---:|---|
| **Source Files (`src/`)** | 321 | 234 `.ts` + 87 `.tsx` files in `src/` (`find src -type f \( -name '*.ts' -o -name '*.tsx' \)`) |
| **React Components (`src/`)** | 87 | `.tsx` files in root `src/` |
| **Edge Functions (`supabase/functions/`)** | 35 | 34 function directories + `_shared` |
| **Database Migrations (`supabase/migrations/`)** | 106 | 102 forward `.sql` files + 4 rollback files under `migrations/rollback/` |
| **CI/CD Workflows (`.github/workflows/`)** | 22 | Active YAML workflows under `.github/workflows/` |
| **Custom Hooks (`src/`)** | 23 | `use*.ts*` files in `src/` |

---

## 3. Sprint APEX-HARDEN-2026-07-16-r3 Task Accomplishment Record

### Task 1: WAF Credential-Scan Block (`http_request_firewall_custom`)
- **Action:** Consolidated atomic WAF Custom Rule targeting sensitive configuration, environment, and credential scanning paths (`/.env`, `.env.bak`, `/root/.boto`, `/serverless.yml`, `/payment/stripe.json`).
- **Rule ID:** `7cfb2ab0e6e744ec82c5a08db142d180` (Ruleset `26324c15fbc84223af4e18d755d26df0`).
- **Cloudflare Free-Tier Compliance:** Consumes exactly 1 custom rule slot (`2/5` rules used overall in zone `apexomnihub.icu`).
- **Verification:** Verified via TDD contract suite (`tests/infrastructure/waf-credential-scan-block.test.ts`) and documented in `OPS_RUNBOOKS_CI_GUARDRAILS.md` (§9.36). Live endpoint probe returns `HTTP 403 Forbidden`.

### Task 2: Cloudflare Pages Domain Alignment & Direct Access Restriction
- **Action:** Configured `apps/omnihub-site/public/_redirects` with explicit `301!` rules redirecting `https://apex-omnihub.pages.dev/*` and `http://apex-omnihub.pages.dev/*` to `https://apexomnihub.icu/:splat`.
- **Shadow Slot Preservation:** Explicitly verified that `apex-omnihub-shadow.pages.dev` (`200 OK`) is untouched and remains the independent staging/preview slot without redirection loops.
- **Verification:** Verified via TDD contract suite (`tests/infrastructure/production-domain-alignment.test.ts`).

### Task 3: Terraform Static Asset Cache Rules Hardening
- **Action:** Hardened `cloudflare_ruleset.cache_rules` in `terraform/environments/production/cloudflare/main.tf` (`rule ID 57b85bbd82674e2d8dfd12cd7eb9bbfe`) and `terraform/modules/cloudflare/main.tf` to target exact static asset extensions (`js, css, png, jpg, svg, woff2`).
- **Safety Invariant:** Explicitly excludes `(http.request.uri.path wildcard "/api/*" or http.request.uri.path wildcard "/functions/v1/*")` so API and Supabase Edge Function requests never get stale cached.
- **Verification:** Verified via TDD (`tests/infrastructure/cloudflare-cacherule-static-assets.test.ts`) and `terraform validate`.

### Task 4: Mobile Drag-and-Drop E2E Viewport Coverage
- **Action:** Added `mobile-iphone` (`iPhone 14` profile, `hasTouch: true`, `isMobile: true`) to `playwright.config.ts`. Created `tests/e2e-playwright/mobile-viewport.spec.ts` asserting viewport bounds, pointer capture, and responsive grid layout fidelity.
- **Safety Invariant:** `DraggableWidget.tsx`, `GlobalCanvas`, and `OmniSpatialHost.tsx` untouched per non-negotiable requirement.
- **Verification:** Verified across 6 browser/device profiles (`chromium`, `firefox`, `mobile-chrome`, `mobile-safari`, `mobile-iphone`, `tablet-ipad`) with 12/12 passing tests.

### Task 5: Release Validation Matrix Reconciliation
- **Action:** Reconciled `docs/release/release-validation-matrix.json` with `evidence-matrix.json` (`artifacts/production-validation/2026-07-16T01-36-38/evidence-matrix.json`), ensuring all runtime items reflect verified evidence and manual items feature exact one-time operational checklists.

### Task 6: Bus-Factor Mitigation & Emergency Succession Governance
- **Action:** Created `docs/ops/SUCCESSION_RUNBOOK.md` detailing credential inventories, emergency recovery sequences, and master bypass sequences. Updated `.github/CODEOWNERS` and `docs/APEX_AGENT_OPERATIONS.md` with explicit succession governance. Patched `scripts/check-react-singleton.mjs` with Windows cross-platform shell compatibility (`shell: process.platform === 'win32'`).
- **Verification:** Verified all documentation pointers pass clean (`npm run docs:check`).

---

## 4. Runtime Quality Gates Status

All runtime quality gates executed clean against the repository:
- `check:react` (`scripts/check-react-singleton.mjs`): **PASS** (`React 18.3.1` singleton confirmed).
- `check:pwa` / `check:omnidash`: **PASS** (`15/15` PWA checks, `43/43` OmniDash integrity invariants).
- `test:infra`: **PASS** (`13/13` infrastructure and WAF/Cloudflare tests, including APEX Test Integrity Doctrine R1 compliance).
- `test:assets`: **PASS** (`200 OK` across static assets, icons, JS/CSS bundles).
- `docs:check`: **PASS** (`0` broken links or code pointers across repository).

---

## 5. SSG Client Hydration & Runtime Stability Remediation (Follow-Up Phase)

During full E2E E2E and diagnostic verification (`diag-console.spec.ts`) against the production static bundle (`vite-react-ssg build`), a high-priority runtime exception (`TypeError: Cannot read properties of undefined (reading 'add')`) was isolated when loading the `/login` route, causing the `RouteErrorBoundary` ("Something went wrong") to trap render initialization.

- **Root Cause & Fix:** While `apps/omnihub-site/src/main.tsx` wrapped `<App />` in `<HelmetProvider>`, the static pre-rendering/hydrated router entry path (`App.tsx` exported structure used across SSG routes) required guaranteed `<HelmetProvider>` context surrounding `Router`/`AppRoutes` to prevent `react-helmet-async` context lookups from failing and interrupting class/DOM mutations. We updated `apps/omnihub-site/src/App.tsx` to wrap `AppRoutes` cleanly within `<HelmetProvider>`, ensuring unified SSR/SSG and CSR initialization.
- **Test Integrity Compliance:** Eliminated a banned `expect.fail()` assertion inside `tests/infrastructure/waf-credential-scan-block.test.ts` to strictly uphold the **APEX Test Integrity Doctrine (R1)** across CI checks.
- **Verification Proof:** E2E diagnostics (`diag-console.spec.ts`) run against the fresh preview bundle (`http://localhost:4173/login`) confirmed **0 console errors** and **0 page errors**, with `/login` rendering cleanly (`cp-02-byom-login.spec.ts` passing (`2 passed | 1 skipped`), and full unit test matrix passing (`289 test files passed | 17 skipped`, `3098 tests passed`)).

