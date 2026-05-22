# CLAUDE.md — APEX OmniHub Agent Operating Manual

**Purpose:** Root operating context for Claude/agent sessions — reduces hallucination, prevents unsafe edits, makes changes traceable to verified repo facts.
**Last verified:** 2026-05-20 | **Critical rule:** If this file conflicts with a more specific in-repo subsystem file, inspect that file first. Mark unverified facts `[UNVERIFIED]`.

---

## 1. Non-Negotiable Rules

**Truth/Verification:** Don't invent paths/scripts/APIs/env vars/test results/migrations/deployment behavior. Verify files via `rg --files`, `find`, or direct reads. Find all `rg` call sites before changing interfaces. State inferences as inferences; state unrun commands as unrun; report env failures exactly.

**Scope Control:** Smallest working change only. No unrelated refactors. No deletes/history-rewrites/credential-rotations/schema-alters/auth-posture changes unless explicitly requested. No new runtime deps without stating performance/security/bundle tradeoff. Never log secrets or print env values.

**Coding Standards:** TS strict-compatible — no `any`, use `unknown`/typed interfaces/generics. No `try/catch` around imports. Explicit control flow over nested ternaries. `globalThis` for portable globals. One concise comment per non-obvious decision. Use existing primitives before adding abstractions.

---

## 2. Verified Repo Identity

| Fact | Value |
| --- | --- |
| Package name/version | `apex-omnihub` · `1.6.0` (`package.json`) |
| Module type / Node engine | `type: module` · `>=22 <25` |
| Frontend toolchain | Vite + React SWC (`vite.config.ts`) · React 18 |
| Mobile wrapper | Capacitor (`capacitor.config.ts`) · appId `com.apexbusiness.omnilink` |
| Test runners | Playwright (`playwright.config.ts`) · Vitest (`vitest.config.ts`) |
| Python lint | Ruff (`pyproject.toml`) · Python 3.11 · line length 88 |

Don't repeat README snapshot counts as facts without recalculating.

**Read before architecture changes:** `README.md` · `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` · `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` · `docs/project-status/CI_STATUS_POLICY.md` · `docs/testing/README.md` · `docs/extensibility/PLUGIN_ARCHITECTURE.md` · `docs/api/EDGE_FUNCTIONS_REFERENCE.md` · `docs/api/API_EXTENSION_GUIDE.md` · `CONTRIBUTING.md`

---

## 3. Repository Topology

| Path | Purpose / caution |
| --- | --- |
| `src/` | Root TS entry, shared libs, gateway/orchestration modules, contracts, components |
| `apps/omnihub-site/src/` | Main React app consumed by root `src/App.tsx` |
| `apps/omnihub-site/dashboard/` | OmniDash shell/widgets — **high-risk**: test selectors, drag behavior |
| `tests/` · `tests/e2e-playwright/` | Vitest/Playwright/integration/infra/security suites |
| `supabase/functions/` | Supabase Edge Functions (Deno-style runtime) |
| `supabase/migrations/` | SQL migrations — **high-risk** |
| `functions/api/` · `api/` | API handlers / middleware outside Supabase tree |
| `orchestrator/` | **Temporal Worker** — `main.py` lifecycle, `server.py` HTTP dispatch. Canonical Python runtime. |
| `services/orchestrator/` | **HTTP API layer** — FastAPI (`api/routes.py`) + FSM (`fsm.py`). Must NOT init Temporal Workers. |
| `omega/` | **APEX Resilience Protocol** — `engine.py` (human-in-the-loop), `dashboard.py` (HTTP approval). Independent; XSS-defended via markupsafe. |
| `apex-resilience/` · `sim/` · `sandbox/` | Resilience framework / simulation / sandbox tooling |
| `android/` · `ios/` | Capacitor mobile shells |
| `packages/` · `docs/` · `reports/` · `public/` | Package subtrees / docs / static assets / PWA |

**Disambiguation (verify path before editing):**

| Path | Runtime | Role |
|---|---|---|
| `orchestrator/` | Python / Temporal | Worker lifecycle + HTTP dispatch |
| `services/orchestrator/` | Python / FastAPI | HTTP API + deterministic FSM |
| `omega/` | Python / stdlib | Human-in-the-loop approval (independent) |
| `src/core/orchestrator/` | TypeScript | Frontend/gateway contract types ONLY |
| `src/omnihub-gateway/` | TypeScript / Node | Edge gateway, MCP client, routing |

---

## 4. App Entry Chain

1. `index.html` → 2. `src/main.tsx` (React root + global styles) → 3. `src/App.tsx` (re-exports) → 4. `apps/omnihub-site/src/App.tsx` (Router + `ProtectedRoute` + `OmniDashProvider`) → 5. `apps/omnihub-site/dashboard/OmniDashShell.tsx` (post-auth shell)

Do not create a second post-auth shell unless architecture is intentionally changed.

---

## 5. Module Aliases

| Config | Alias | Resolves to |
| --- | --- | --- |
| `tsconfig.json` | `@/dashboard/*` | `./apps/omnihub-site/dashboard/*` |
| `tsconfig.json` | `@/*` | `./apps/omnihub-site/src/*` |
| `vite.config.ts` | `dashboard` · `@/dashboard` | `./apps/omnihub-site/dashboard` |
| `vite.config.ts` | `@` | `./apps/omnihub-site/src` |

`@/...` = `apps/omnihub-site/src/...` in Vite. Do not redirect to root `src/` without checking Vitest + build. Alias changes require `npm run typecheck`, `npm run test`, and targeted import validation.

---

## 6. Package Manager

Lockfiles: `package-lock.json` · `bun.lock` · `packages/infrastructure/bun.lock`. **npm is authoritative** for CI/releases. Use `npm run <script>` unless user requests Bun. Do not run install commands just to make tasks work. Don't modify lockfiles unless dependency changes are the explicit task.

---

## 7. Core Commands (run from repo root)

| Category | Command | Notes |
| --- | --- | --- |
| Dev | `npm run dev` | Vite dev server, port 8080 |
| Build | `npm run build` | Production; runs prebuild |
| Build | `npm run build:dev` · `npm run build:seo` | Dev-mode / sitemap+build |
| Preview | `npm run preview` | Port 4173 |
| Type | `npm run typecheck` | `tsc --noEmit` |
| Lint | `npm run lint` · `npm run check:react` | ESLint / React singleton check |
| Docs | `npm run docs:check` | Link + code-pointer checks |
| Test | `npm run test` | Vitest full suite |
| Test | `npm run test:unit` · `npm run test:integration` | `tests/lib` / `tests/integration` |
| Test | `npm run test:infra` · `npm run test:assets` | Infra / asset smoke (needs `:4173`) |
| Test | `npm run test:prompt-defense` | Prompt-defense suite |
| E2E | `npm run test:e2e` · `npm run test:e2e:ci` | All / chromium only |
| E2E | `npm run test:e2e:install` | Install Playwright Chromium |
| Python | `npm run lint:py` · `npm run format:py` | Ruff check+format |
| Python | `npm run test:py` · `npm run ci:py` | pytest / lint+test |
| Security | `npm run secret:scan` · `npm run security:audit` | Scan / audit → `security/npm-audit-latest.json` |
| Ops | `npm run smoke-test` · `npm run guardian:status` · `npm run omnilink:health` | |
| Ops | `npm run zero-trust:baseline` · `npm run dr:test` · `npm run ci:runtime-gates` | |

Only claim a gate passed if you ran it and saw a passing exit code.

---

## 8. Environment Variables

| Scope | Variable |
| --- | --- |
| Public browser (`VITE_*`) | `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` · `VITE_SUPABASE_ANON_KEY` |
| Build/test fallbacks | `SUPABASE_URL` · `SUPABASE_PUBLISHABLE_KEY` · `SUPABASE_ANON_KEY` |
| Server/admin (NOT browser-safe) | `SUPABASE_SERVICE_ROLE_KEY` · `SUPABASE_JWT_SECRET` |

- `scripts/check-env-root.mjs` validates Supabase env before build; logs names only, never values.
- `vite.config.ts` exposes only browser-safe vars + `VITE_IS_CI` via `loadEnv`/`define`.
- Never expose service-role keys, JWT secrets, Stripe/webhook secrets via `import.meta.env` or frontend code.

---

## 9. Supabase & Auth

- Client: `apps/omnihub-site/src/lib/supabase.ts` — `createClient`, PKCE flow, browser localStorage (when `globalThis.window` exists); prefers `VITE_SUPABASE_PUBLISHABLE_KEY`, falls back to `VITE_SUPABASE_ANON_KEY`.
- Auth context: `src/contexts/AuthContext.tsx`
- E2E helper: `tests/e2e-playwright/helpers/auth.ts` — real session via email/password or anon; seeds state into `globalThis.localStorage` via `page.addInitScript`; skips when Supabase absent/unreachable.
- Do not replace real auth flows with fake tokens unless testing a mocked unit boundary.

---

## 10. Vite Build Invariants

Plugin: `@vitejs/plugin-react-swc` · dev `::`:8080 · preview 4173 · `envPrefix: 'VITE_'` · React dedupe (`react`, `react-dom`) · target `es2020` · `terser` minification (removes console/debugger) · manual chunks: React/Web3/Radix/Supabase/charting/motion/i18n · Node-only packages externalized. Do not import server-only modules into React. Run `npm run build` after chunking/externals changes.

---

## 11. Testing

**Vitest:** Targeted specs for localized changes. Contract/shared lib changes: narrow target + `npm run typecheck`. Include component tests when changing React components.

**Playwright:** test dir `tests/e2e-playwright` · base URL `BASE_URL` or `http://localhost:4173` · web server `npm run build && npm run preview` · CI projects `chromium`+`mobile-chrome` · local adds Firefox/mobile Safari/iPad · traces on first retry · screenshots on failure. Missing browsers → `npm run test:e2e:install`. Auth specs → `tests/e2e-playwright/helpers/auth.ts`. Selectors: role/name or `data-testid`; no brittle CSS.

**Environment-limited:** Capture exact command + blocker. Mark as env limitation, not code failure. Do not claim behavior passed.

---

## 12. ESLint & Code Quality

- `@typescript-eslint/no-explicit-any` → **error**; `no-console` → warning (except scripts/tests/infra)
- React hooks recommended rules enabled
- OmniDash app names restricted in dashboard — use contracts, not hardcoded names
- `OmniDashShell.tsx` must consume sidebar widget contracts, not local NAV maps
- Prefer explicit statements over nested ternaries; `globalThis` over `window`/`global`
- Check `sonar-project.properties` before modifying coverage/exclusion behavior

---

## 13. OmniDash Guardrails

**High-risk files:** `apps/omnihub-site/dashboard/OmniDashShell.tsx` · `apps/omnihub-site/dashboard/DraggableWidget.tsx` · `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts` · `src/contracts/omnidash.contract.ts`

- No hardcoded app/module names — use contracts.
- Preserve `data-testid` unless tests updated in same change.
- `DraggableWidget`: drag threshold + localStorage persistence; include pointer/drag coverage when changing.
- Post-auth interactions stay inside OmniDash/modals/PiP unless route architecture changes intentionally.

---

## 14. Edge Functions · Database · Python · Mobile

**Edge Functions:** `supabase/functions/*` (Deno-like) · `functions/api/*` · `api/*`. No Node `Buffer`/fs/process APIs. CORS + auth checks explicit. Never weaken webhook/JWT verification.

**Database:** Migration dirs `supabase/migrations/` + `supabase/migrations/rollback/`. High-risk. Verify names with `rg` before SQL. Additive-only. No drops without rollback strategy + user approval. RLS changes: run `scripts/security/check_rls_posture.sh`.

**Python:** `orchestrator/` (Temporal Worker), `services/orchestrator/` (FastAPI), `src/core/orchestrator/` (TS types) are **different runtimes — do not conflate**. Ruff for lint/format. No broad exception swallowing. Missing deps → report the issue.

**Mobile:** `appId: com.apexbusiness.omnilink` · `appName: OmniLink` · `webDir: dist` · push: badge/sound/alert. Web changes must build into `dist` before Capacitor sync. Don't edit generated Android/iOS artifacts unless required. PWA changes: check `public/manifest.webmanifest`, icons, `public/sw.js`.

---

## 15. Security Guardrails

**Never commit:** service-role keys · private keys/mnemonics · JWT signing secrets · Stripe/webhook secrets · OAuth client secrets · raw production customer data

Before committing: `npm run secret:scan`. Prefer deny-by-default. No bypassing auth/RLS/CORS/CSP/rate-limits/signature-checks without explicit authorization. Document accepted risk.

**2026-05-20 security fixes (branch `claude/audit-tech-debt-Pmwkx`):**
- `.github/workflows/integration.yml`: action SHAs pinned, Node→24, GH_PAT URL masking
- `.github/workflows/deploy-omnihub-proof.yml`: action SHAs + wrangler-action pinned
- `.github/workflows/dependency-consolidation.yml`: auto-merge requires CI green
- `.lighthouserc.json`: accessibility + color-contrast enforced as errors
- `sonar-project.properties`: `src/`+`apps/`+`packages/` visible to SonarCloud coverage
- `supabase/functions/stripe-webhook/index.ts`: `STRIPE_SECRET_KEY`+`STRIPE_WEBHOOK_SECRET` required; 503 on missing
- `supabase/functions/_shared/requestSigning.ts`: `ORCHESTRATOR_SHARED_SECRET` required; throws on missing
- `apps/omnihub-site/src/styles/theme.css`: `--color-text-muted` darkened `#94a3b8`→`#607090` (2.42:1→4.97:1 on white) — fixes Lighthouse `color-contrast` error on marketing pages
- `apps/omnihub-site/src/components/ui/dialog.tsx`: dialog close button switched from `opacity-70` to `text-muted-foreground` — semantic color over transparency
- `apps/omnihub-site/src/pages/ManMode.tsx`: three section headings replaced `opacity-70` with `style={{ color: 'var(--color-text-muted)' }}`
- `apps/omnihub-site/src/pages/ComingSoon.tsx`, `apps/omnihub-site/src/pages/Launch/OnboardingWizard.tsx`: `text-gray-400`/`text-gray-500` → `text-muted-foreground`

---

## 16. Git & PR Workflow

Before: `git status --short --branch`. Keep diffs focused. Inspect unexpected modified files before touching. Commit only task-related files. Prefer conventional commits; use exact message if user provides one. Verify `git remote -v` before claiming a push (no remote in some automation envs).

After: `git diff --check && git status --short --branch`. Report all validation commands exactly.

---

## 17. Response Contract

Code changes must include: **1. Diagnosis** · **2. Solution** · **3. Files changed (with paths)** · **4. Verification (exact commands + pass/fail/env-limited)** · **5. Next Action**. Never claim tests passed unless executed.

### Authenticated E2E failure
1. `tests/e2e-playwright/helpers/auth.ts`
2. Confirm `VITE_SUPABASE_URL` + browser-safe key vars exist
3. `npm run test:e2e:install` if browser launch fails
4. `CI=1 npx playwright test <spec> --project=chromium`

## 18. Agent Auto-Update Protocol

Every session making verified, committed changes MUST update this file before final push:

1. Update "Last verified" date (header).
2. Update §24 with new environment facts.
3. Update relevant table/bullet if a verified fact changed (path/command/alias/env var).
4. Append to `DRIFT_MATRIX.md`: `| DATE | TOPIC | FILE(s) CHANGED | WHAT CHANGED |`
5. Append to `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` if certification state changed.
6. Facts only — no prose commentary.
7. Run `npm run typecheck` and `npm run docs:check` before committing.
8. Single commit: `docs(claude): update CLAUDE.md and drift record — [DATE]`

---

## 19. Hallucination Prevention Checklist

Before answering/editing: Did I verify the file path? · Did I inspect config (not memory)? · Did I search call sites before changing exports/contracts? · Did I avoid claiming status from stale docs? · Did I avoid exposing secrets via frontend? · Did I run validation or state why not? · Did I keep the patch in scope? → **If any "no," stop and verify.**

**File:** `.github/workflows/release.yml` — triggers on `push` to `main`.

## 20. Fast Triage Recipes

**Build/env failure:** `scripts/check-env-root.mjs` → `vite.config.ts` loadEnv/define → `apps/omnihub-site/src/lib/supabase.ts` → `npm run typecheck` → `npm run build`

**E2E auth failure:** `tests/e2e-playwright/helpers/auth.ts` → confirm Supabase URL+key envs → `npm run test:e2e:install` if launch fails → `CI=1 npx playwright test <spec> --project=chromium`

**OmniDash selector failure:** Check role/name or `data-testid` → check contracts before hardcoding names → accessible selectors first, `data-testid` second → update tests + component together

**React duplicate/context:** `npm run check:react` → inspect Vite/Vitest alias+dedupe → no nested React deps

**Docs pointer failure:** `npm run docs:check` → fix broken paths/anchors → never remove doc checks to pass CI

---

## 21. Current Known Issues (2026-05-20)

- Python orchestrator tests require `temporalio`, `numpy`, etc. not in base CI — run `pip install -r orchestrator/requirements.txt` first.
- `npm run test:assets` requires preview server at `localhost:4173` — run `npm run preview` first or treat as environment-limited.
- No git remote in some automation environments — verify `git remote -v` before claiming a push.
- Playwright launch fails if browser binaries missing — install with `npm run test:e2e:install`.
- Network-dependent Supabase tests may skip/fail when Supabase Auth is unreachable.
