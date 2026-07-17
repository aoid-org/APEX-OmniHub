# Canonical State Record - 2026-07-16 (Sprint APEX-HARDEN-2026-07-16-r3 Completion & SSG Hydration Fix)

Authoritative snapshot of repo state after the completion of the Security & Reliability Hardening Sprint and SSG Client Hydration remediation. Code and live verified diagnostic traces (`diag-console.spec.ts`) are the source of truth.

## 1. Remediated Surfaces (Canonical Behavior)

| Surface | File | Canonical behavior after Sprint APEX-HARDEN-2026-07-16-r3 |
|---|---|---|
| WAF Custom Rules | `tests/infrastructure/waf-credential-scan-block.test.ts` | WAF Custom Rule `7cfb2ab0e6e744ec82c5a08db142d180` active in `block` mode targeting `/.env`, `.env.bak`, `/root/.boto`, `/serverless.yml`, and `/payment/stripe.json`. Consumes exactly 1 slot (`2/5` used overall). APEX Test Integrity Doctrine R1 enforced (`expect.fail` removed). |
| Domain Alignment | `apps/omnihub-site/public/_redirects` | `apex-omnihub.pages.dev/*` (`http` & `https`) redirected with `301!` to `https://apexomnihub.icu/:splat`. Shadow slot `apex-omnihub-shadow.pages.dev` (`200 OK`) preserved without redirect loops. |
| Static Asset Cache | `terraform/environments/production/cloudflare/main.tf` | Cache rules specifically target static asset extensions (`js, css, png, jpg, svg, woff2`) while strictly excluding `/api/*` and `/functions/v1/*` paths. |
| Mobile E2E Drag/Drop | `playwright.config.ts`, `tests/e2e-playwright/mobile-viewport.spec.ts` | iPhone 14 profile (`mobile-iphone`) verified with full responsive drag-and-drop grid layout tests (`12/12 passing across 6 device profiles`). `DraggableWidget.tsx` and `GlobalCanvas` preserved untouched. |
| SSG Hydration / Login Runtime | `apps/omnihub-site/src/App.tsx`, `tests/app-helmet-provider.test.tsx` | `<AppRoutes />` wrapped inside `<HelmetProvider>` directly within `App.tsx` return structure. Prevents `react-helmet-async` `Cannot read properties of undefined (reading 'add')` crash during SSG (`vite-react-ssg`) hydration on `/login`. E2E console diagnostics confirm 0 console errors / 0 page crashes. |
| Bus-Factor Governance | `docs/ops/SUCCESSION_RUNBOOK.md`, `scripts/check-react-singleton.mjs` | Emergency succession runbook registered in `.github/CODEOWNERS`. `check-react-singleton.mjs` patched with `shell: process.platform === 'win32'` for cross-platform execution. |

## 2. Verified Statistics & Reference
- **Release Line:** `1.8.3` (`package.json`), App `1.3.10`.
- **Test Matrix Status:** Unit test matrix verified (`289 passed | 17 skipped`, `3098 tests passed`). E2E tests verified (`diag-console.spec.ts`, `cp-02-byom-login.spec.ts`).
- **Primary Canonical Reference:** See `memory/omni-recall/docs/CURRENT_PLATFORM_STATE_2026_07_16.md`.

## 3. Post-Sprint Layout & Governance Remediation (PR #1640 & PR #1642)

Following the primary hardening sprint, the following governance and interface changes were integrated:
- **Lower-Viewport UI Overlays (PR #1640 - Merged)**: Aligned safe-area stacking, resolved bottom-nav/overlays overlap in `.lower-right-stack`, corrected sun/moon theme triggers, and unified CTA button size parity.
- **Onboarding & Breakpoint Audits (PR #1642 - Open)**: Documented locked-file boundaries for PR #1641 (OmniBoard integration runtime), mapped the absolute repository-relative paths of the OmniBoard registry, and created the 5-tier responsive viewport truth table (`docs/debt-closeout/`).
- **OmniBoard Integration Runtime (PR #1641 - Open)**: Adds custom non-catalog integration onboarding, ConnectorKit key generation, and background probes.

