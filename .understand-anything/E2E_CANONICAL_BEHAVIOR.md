# APEX-OmniHub E2E & Production Readiness Canonical Behavior

## 1. PWA Hydration Stability
**Invariant:** The `beforeinstallprompt` event can fire before React completes hydration.
**Rule:** `index.html` MUST capture the event globally into `window.__deferredPWAEvent`. React hooks (e.g. `usePWAInstall`) must consume this global object upon mount. Never rely solely on an event listener attached inside a component.

## 2. E2E Test Doctrine
**Invariant:** A green CI that masks real product defects is a threat to production stability. 
**Rule:** 
- `test.fail()` is explicitly banned.
- Test skips/fixmes MUST contain a formal blocker reference directly on the SAME LINE as `.skip`, e.g., `test.skip('...', async () => { // APEX-1106)`. This is strictly enforced by the `check-doc-paths.sh` R2 Integrity Sentinel.
- Vague verdicts like "PARTIAL PASS" are banned.
- Modals MUST be asserted using `assertModalIdentityAndIsolation` to prove rendering fidelity and correct DOM portal boundaries. Never rely on generic `[role="dialog"]` visibility checks.
- Hanging tests that fail due to missing UI elements MUST be skipped properly (with an APEX tracker) rather than left to time out. A single timeout with 2 retries consumes 9 minutes of CI runtime, which will cause the GitHub Actions `build-and-test` job to hit its 45-minute limit and fail.
- `playwright.config.ts` uses 3 workers and a `list` reporter in CI to maximize efficiency and visibility.

## 3. Alias Resolution Split (Vitest vs Vite)
**Invariant:** Vitest and Vite intentionally resolve `@/` paths differently in this monorepo.
**Rule:** `vitest.config.ts` maps `@/` to `./src`, while `vite.config.ts` maps it to `./apps/omnihub-site/src`. This split is load-bearing. 
When mocking core modules in Vitest (e.g., `vi.mock('@/contracts/omnidash-sidebar-widgets')`), you MUST use exact-match aliases in `vitest.config.ts` to pin the module correctly and avoid `import-analysis` Vite plugin collisions.

## 4. Modal Responsive Layout
**Invariant:** Hardcoded maximum widths (e.g., `sm:max-w-[425px]`) without sub-sm constraints will push dialogs off-canvas on devices like iPads in mobile mode.
**Rule:** Dialog components must ALWAYS carry sub-sm constraints: `w-[calc(100%-2rem)] max-w-md mx-auto`. 

## 5. Supabase E2E Architecture
**Invariant:** Mocked database states create false confidence. 
**Rule:** The E2E suite runs against a live Supabase project (`apex-omnihub-e2e`). 
- **Seeding:** The suite uses `E2E_SUPABASE_SERVICE_ROLE_KEY` to run an idempotent `beforeAll` seed harness that provisions dynamic test users, uploads files, and structures mock workflows.
- **Security Validation:** The test suite MUST actively verify proper execution of RLS (e.g., User B cannot view User A's data) and append-only immutability of the `audit_logs` table during runtime.

## 6. Playwright Navigation & Supabase Long-Polling
**Invariant:** `networkidle` conditions will timeout in CI because Supabase opens long-polling/websocket connections for real-time features.
**Rule:** When calling `page.waitForNavigation`, `page.goto`, or `signInWithSupabaseSession`, ALWAYS use `waitUntil: 'domcontentloaded'` instead of `networkidle`. Use explicit visual assertions (e.g., `expect(page.locator('...')).toBeVisible()`) to ensure the page has fully loaded.

## 7. Repo Evidence vs Live Production Proof
**Invariant:** Repository evidence is implementation evidence, not proof that production/staging/live systems behaved correctly.
**Rule:** Do not label GitHub Actions status, Cloudflare deployment behavior, Supabase migration state, RLS tenant isolation, billing, BYOM provider calls, OAuth callbacks, mobile native behavior, or WebAuthn/biometric device flows as VERIFIED unless they were actually exercised in the current environment with real credentials/evidence. Use `BLOCKED` or `REQUIRES_MANUAL_VALIDATION` when credentials, devices, backend reachability, or owner-controlled environments are absent.

## 8. OmniDash Local Launch Truthfulness
**Invariant:** A local UI launch is not the same as a backend-confirmed connector success.
**Rule:** Spatial/microfrontend/local launches must use `LOCAL_LAUNCHED` plus local-only confirmation metadata. Only flows with a successful backend exchange/mutation/read-back may hydrate OmniBoard as backend-confirmed `LIVE`. Tests must prevent local-only actions from becoming fake success states.

## 9. Production-Safe Live Validation Harness
**Invariant:** Live production validation must be non-destructive by default and must produce sanitized evidence before any certification claim.
**Rule:** Use `APEX_PROD_URL=https://apexomnihub.icu npm run test:e2e:production-safe` for public/auth-gated route evidence. Use `npm run perf:k6:smoke` only when k6 is installed; missing k6 is `BLOCKED`, not pass. Do not certify Request Access persistence, auth, OAuth, passkeys, Supabase RLS, BYOM, billing, OmniDash persistence, Cloudflare deployment provenance, or branch protection from route rendering alone.
