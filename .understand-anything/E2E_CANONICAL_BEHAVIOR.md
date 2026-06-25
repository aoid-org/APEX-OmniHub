# APEX-OmniHub E2E & Production Readiness Canonical Behavior

## 1. PWA Hydration Stability
**Invariant:** The `beforeinstallprompt` event can fire before React completes hydration.
**Rule:** `index.html` MUST capture the event globally into `window.__deferredPWAEvent`. React hooks (e.g. `usePWAInstall`) must consume this global object upon mount. Never rely solely on an event listener attached inside a component.

## 2. E2E Test Doctrine
**Invariant:** A green CI that masks real product defects is a threat to production stability. 
**Rule:** 
- `test.fail()` is explicitly banned.
- Test skips/fixmes MUST contain a formal blocker reference, e.g., `test.skip(..., 'BLOCKED(APEX-1106)')`.
- Vague verdicts like "PARTIAL PASS" are banned.
- Modals MUST be asserted using `assertModalIdentityAndIsolation` to prove rendering fidelity and correct DOM portal boundaries. Never rely on generic `[role="dialog"]` visibility checks.

## 3. Modal Responsive Layout
**Invariant:** Hardcoded maximum widths (e.g., `sm:max-w-[425px]`) without sub-sm constraints will push dialogs off-canvas on devices like iPads in mobile mode.
**Rule:** Dialog components must ALWAYS carry sub-sm constraints: `w-[calc(100%-2rem)] max-w-md mx-auto`. 

## 4. Supabase E2E Architecture
**Invariant:** Mocked database states create false confidence. 
**Rule:** The E2E suite runs against a live Supabase project (`apex-omnihub-e2e`). 
- **Seeding:** The suite uses `E2E_SUPABASE_SERVICE_ROLE_KEY` to run an idempotent `beforeAll` seed harness that provisions dynamic test users, uploads files, and structures mock workflows.
- **Security Validation:** The test suite MUST actively verify proper execution of RLS (e.g., User B cannot view User A's data) and append-only immutability of the `audit_logs` table during runtime.
