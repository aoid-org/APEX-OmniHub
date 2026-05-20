# CLAUDE.md — APEX OmniHub Agent Operating Manual

**Purpose:** This file is the root operating context for Claude/agent sessions in this repository. It exists to reduce hallucination, prevent unsafe edits, and make every code change traceable to verified repo facts.

**Last verified:** 2026-05-14 from the repository contents in this checkout.

**Critical rule:** If this file conflicts with a more specific in-repo file for a subsystem, inspect that file before acting. If a fact is not verified from the repo or from an explicit user instruction, mark it as `[UNVERIFIED]` instead of guessing.

---

## 1. Non-Negotiable Agent Rules

### 1.1 Truth and Verification

- Do **not** invent paths, scripts, APIs, env vars, test results, migrations, or deployment behavior.
- Before referencing a file, verify it with `rg --files`, `find`, or direct reads.
- Before changing an interface or public contract, find all call sites with `rg`.
- If behavior is inferred from code rather than documentation, state that it is an inference.
- If a command was not run, say it was not run.
- If a command fails due to environment limitations, report the exact failure and do not reframe it as a code failure.

### 1.2 Scope Control

- Make the smallest working change that satisfies the task.
- Do not refactor unrelated modules while fixing a localized issue.
- Do not delete files, rewrite history, rotate credentials, alter production schemas, or change auth/security posture unless explicitly requested.
- Do not add runtime dependencies unless the performance, security, maintenance, and bundle-size tradeoff is stated.
- Never log secrets or print full env values. Redact tokens, keys, cookies, JWTs, and webhook secrets.

### 1.3 Coding Standards

- TypeScript must stay strict-compatible. Avoid `any`; use `unknown`, typed interfaces, or generics.
- Never wrap imports in `try/catch` blocks.
- Prefer explicit control flow over nested ternaries when readability suffers.
- Prefer `globalThis` for portable browser/global access when feasible.
- Keep non-obvious logic commented with one concise decision-point comment.
- Use existing stack primitives before adding new abstractions.

---

## 2. Verified Repo Identity

APEX OmniHub is a proprietary Universal Sync Orchestrator / governed execution platform. The README describes the system as the coordination layer for OmniHub, OmniLink, and OmniPort and points contributors to the canonical architecture and project-status docs.

Verified root metadata:

| Fact | Verified source |
| --- | --- |
| Package name | `package.json` → `apex-omnihub` |
| Package version | `package.json` → `1.6.0` |
| Module type | `package.json` → `type: module` |
| Node engine | `package.json` → `>=22 <25` |
| Frontend toolchain | Vite + React SWC plugin in `vite.config.ts` |
| React runtime | React 18 dependency in `package.json` |
| Mobile wrapper | Capacitor config in `capacitor.config.ts`; Android app id `com.apexbusiness.omnilink` |
| E2E runner | Playwright config in `playwright.config.ts` |
| Unit/integration runner | Vitest config in `vitest.config.ts` |
| Python lint target | Ruff config in `pyproject.toml` |

Do not repeat old README snapshot counts as current facts unless you recalculate them. Some README statistics are dated snapshots and may drift.

---

## 3. Canonical Documentation Map

Read these before architecture-level changes:

- `README.md` — high-level product overview and start-here links.
- `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` — canonical architecture map.
- `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` — production certification authority.
- `docs/project-status/CI_STATUS_POLICY.md` — CI status policy.
- `docs/testing/README.md` — testing documentation.
- `docs/extensibility/PLUGIN_ARCHITECTURE.md` — plugin/extensibility architecture.
- `docs/api/EDGE_FUNCTIONS_REFERENCE.md` — Supabase edge function reference.
- `docs/api/API_EXTENSION_GUIDE.md` — API extension guidance.
- `CONTRIBUTING.md` — contribution workflow.

When editing docs, keep links and file pointers accurate. Prefer `npm run docs:check` for validation when feasible.

---

## 4. Repository Topology

Major verified directories:

| Path | Purpose / caution |
| --- | --- |
| `src/` | Root TypeScript entry, shared libraries, gateway/orchestration modules, contracts, components, integrations. |
| `apps/omnihub-site/src/` | Main React app implementation consumed by root `src/App.tsx`. |
| `apps/omnihub-site/dashboard/` | OmniDash shell/widgets; high-risk UI surface with test selectors and drag behavior. |
| `tests/` | Vitest, Playwright, integration, infra, security, and domain test suites. |
| `tests/e2e-playwright/` | Playwright E2E specs configured by `playwright.config.ts`. |
| `supabase/functions/` | Supabase Edge Functions using Deno-style runtime patterns. |
| `supabase/migrations/` | SQL migrations; treat schema edits as high-risk. |
| `functions/api/` | API/function handlers outside Supabase function tree. |
| `api/` | API middleware/routes used by serverless/function surfaces. |
| `orchestrator/` | **Temporal Worker** — `main.py` is the worker lifecycle entrypoint; `server.py` is HTTP workflow dispatch. This is the canonical Python runtime. |
| `services/orchestrator/` | **HTTP API layer** — FastAPI routes (`api/routes.py`) + deterministic FSM (`fsm.py`). Must not initialise Temporal Workers (enforced by CI guardrail). |
| `omega/` | **APEX Resilience Protocol** — Human-in-the-loop verification engine (`engine.py`) and HTTP approval dashboard (`dashboard.py`). Not a Temporal service; runs independently. XSS-defended via markupsafe. Covered by pytest `--cov=../omega`. |
| `apex-resilience/` | Resilience framework, scripts, and tests. |
| `sim/`, `sandbox/` | Simulation and sandbox tooling. |
| `android/`, `ios/` | Capacitor mobile shells. |
| `packages/` | Package subtrees, including infrastructure and sales package areas. |
| `docs/`, `reports/` | Architecture, status, audits, reports. |
| `public/` | Static assets, PWA files, redirects, headers, manifest, service worker. |

**Similarly-named area disambiguation** — always verify the target path before editing:

| Path | Runtime | Role |
| --- | --- | --- |
| `orchestrator/` | Python / Temporal | Worker lifecycle + HTTP dispatch |
| `services/orchestrator/` | Python / FastAPI | HTTP API + deterministic FSM |
| `omega/` | Python / stdlib | Human-in-the-loop verification (independent) |
| `src/core/orchestrator/` | TypeScript | Frontend/gateway contract types only |
| `src/omnihub-gateway/` | TypeScript / Node | Edge gateway, MCP client, routing |

---

## 5. App Entry and Routing Facts

Verified app entry chain:

1. `index.html` loads the Vite app.
2. `src/main.tsx` creates the React root, imports global styles, and renders `src/App.tsx`.
3. `src/App.tsx` re-exports `apps/omnihub-site/src/App.tsx`.
4. `apps/omnihub-site/src/App.tsx` owns React Router routes and wraps the protected OmniDash surface.
5. `apps/omnihub-site/dashboard/OmniDashShell.tsx` is the post-auth OmniDash shell.

Routing invariant verified in `apps/omnihub-site/src/App.tsx`:

- Pre-auth routes include landing, login/auth, legal, request access, and product/marketing pages.
- Post-auth OmniDash is the protected app surface.
- `ProtectedRoute` and `OmniDashProvider` are part of the authenticated flow.

Do not create a second post-auth shell unless the task explicitly changes architecture.

---

## 6. Module Resolution and Alias Rules

Verified TypeScript aliases in `tsconfig.json`:

```text
@/dashboard/* -> ./apps/omnihub-site/dashboard/*
@/*           -> ./apps/omnihub-site/src/*
```

Verified Vite aliases in `vite.config.ts`:

```text
dashboard    -> ./apps/omnihub-site/dashboard
@/dashboard  -> ./apps/omnihub-site/dashboard
@            -> ./apps/omnihub-site/src
```

Operational guidance:

- In the Vite app, `@/...` means `apps/omnihub-site/src/...`.
- Use `@/dashboard/...` or `dashboard/...` for dashboard shell files.
- Do not “fix” aliases by pointing everything at root `src/` without checking Vitest and app build behavior.
- If changing aliases, validate `npm run typecheck`, `npm run test`, and targeted imports.

---

## 7. Package Manager and Lockfile Policy

Verified lockfiles present:

- `package-lock.json`
- `bun.lock`
- `packages/infrastructure/bun.lock`

Verified scripts are defined in root `package.json` and are npm-compatible. Existing configs also invoke npm directly, including Playwright web server command `npm run build && npm run preview`.

Default guidance for agents in this repo:

- Use `npm run <script>` for root package scripts unless the user explicitly requests Bun.
- Do not run `npm install`, `bun install`, `pnpm install`, or `yarn install` just to make a task work.
- Do not modify lockfiles unless dependency changes are the requested task.
- If dependency installation is necessary, state why before changing lockfiles and verify both package and lockfile diffs.

---

## 8. Core Commands

Run commands from repo root unless noted.

### 8.1 Development and Build

```bash
npm run dev          # Vite dev server; configured port 8080
npm run build        # Production build; runs prebuild first
npm run build:dev    # Development-mode build
npm run preview      # Vite preview; configured port 4173
npm run build:seo    # Generate sitemap then build
```

### 8.2 Type, Lint, and Docs

```bash
npm run typecheck    # tsc -p tsconfig.json --noEmit
npm run lint         # eslint .
npm run check:react  # React singleton check
npm run docs:check   # doc link and code-pointer checks
```

### 8.3 Tests

```bash
npm run test                 # Vitest full suite
npm run test:unit            # tests/lib
npm run test:integration     # tests/integration
npm run test:infra           # infrastructure tests
npm run test:assets          # static asset smoke check
npm run test:prompt-defense  # prompt-defense tests
npm run test:e2e             # Playwright all configured projects
npm run test:e2e:ci          # Playwright chromium project
npm run test:e2e:install     # Install Playwright Chromium
```

### 8.4 Python

```bash
npm run lint:py      # cd orchestrator && ruff check + format check
npm run format:py    # cd orchestrator && ruff format
npm run test:py      # cd orchestrator && pytest -q
npm run ci:py        # lint:py + test:py
```

### 8.5 Security, Ops, and Specialized Gates

```bash
npm run secret:scan          # secret scanner wrapper
npm run security:audit       # npm audit JSON output to security/npm-audit-latest.json
npm run smoke-test           # deployment smoke test script
npm run guardian:status      # Guardian status check
npm run omnilink:health      # OmniLink health check
npm run zero-trust:baseline  # zero-trust baseline CLI
npm run dr:test              # disaster recovery dry run
npm run ci:runtime-gates     # check:react + assets + infra + e2e
```

Only claim a gate passed if you ran it and saw a passing exit code.

---

## 9. Environment Variables and Secret Handling

### 9.1 Public Browser Supabase Variables

Verified public browser config names:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_ANON_KEY
```

Verified fallback names used by build/test helpers:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_ANON_KEY
```

Operational rules:

- `VITE_*` values are browser-exposed by Vite. Treat them as public-only.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, JWT secrets, Stripe secrets, webhook secrets, private keys, or admin tokens through `import.meta.env` or frontend code.
- `scripts/check-env-root.mjs` validates Supabase env availability before build and logs only source names, not values.
- `vite.config.ts` uses `loadEnv` and `define` to expose only browser-safe Supabase variables and `VITE_IS_CI`.

### 9.2 Server/Admin Variables

Server-side modules may reference variables such as:

```text
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
```

These are not browser-safe. If a task touches server/admin env handling, verify runtime context first.

---

## 10. Supabase and Auth Architecture

Verified frontend Supabase client:

- `apps/omnihub-site/src/lib/supabase.ts`
- Uses `@supabase/supabase-js` `createClient`.
- Prefers `VITE_SUPABASE_PUBLISHABLE_KEY`, falls back to `VITE_SUPABASE_ANON_KEY`.
- Uses PKCE auth flow and browser localStorage when `globalThis.window` exists.

Verified auth context references:

- `src/contexts/AuthContext.tsx` checks Supabase URL and browser-safe key envs.
- Login UI surfaces missing browser config guidance.

E2E auth helper:

- `tests/e2e-playwright/helpers/auth.ts` creates a real Supabase session by using provided email/password credentials or anonymous sign-in.
- It seeds Supabase-compatible auth state into `globalThis.localStorage` via Playwright `page.addInitScript`.
- It skips when Supabase config is absent or unreachable from the test runner.

Do not replace real auth flows with fake tokens unless explicitly testing a mocked unit boundary.

---

## 11. Vite Build and Bundle Invariants

Verified `vite.config.ts` behavior:

- React plugin: `@vitejs/plugin-react-swc`.
- Dev server host: `::`; port: `8080`.
- Preview port: `4173`.
- `envPrefix: 'VITE_'`.
- React dedupe includes `react` and `react-dom`.
- Build target is `es2020`.
- Production minification uses `terser` with console/debugger removal.
- Manual chunks split React, Web3, Radix UI, Supabase, charting, motion, and i18n dependencies.
- Some Node-only packages are externalized from the browser bundle.

Bundle safety rules:

- Keep Node-only packages out of browser paths unless Vite externalization/polyfill behavior is verified.
- Do not import server-only modules into React components.
- If changing chunking or externals, run `npm run build` and inspect warnings.

---

## 12. Testing Strategy and Known Constraints

### 12.1 Vitest

- Use targeted Vitest specs for localized changes where possible.
- For shared library or contract changes, run the narrow target plus `npm run typecheck`.
- If changing React components, include relevant component tests when present.

### 12.2 Playwright

Verified `playwright.config.ts`:

- Test dir: `tests/e2e-playwright`.
- Base URL: `BASE_URL` or `http://localhost:4173`.
- Local web server command: `npm run build && npm run preview`.
- CI projects: `chromium` and `mobile-chrome`; local projects include Firefox, mobile Safari, and iPad.
- Traces are on first retry; screenshots only on failure.

Operational rules:

- If Playwright browser binaries are missing, run or recommend `npm run test:e2e:install` rather than misdiagnosing test code.
- Authenticated E2E specs should use `tests/e2e-playwright/helpers/auth.ts` unless the test specifically exercises login UI.
- Stable selectors should use role/name or `data-testid`; avoid brittle CSS chains.

### 12.3 Environment-Limited Test Runs

When a command fails because browsers, services, network, or credentials are unavailable:

1. Capture the exact command.
2. Capture the exact blocker.
3. Mark the result as an environment limitation, not a code failure.
4. Do not claim the covered behavior passed.

---

## 13. ESLint, SonarQube, and Maintainability Rules

Verified ESLint highlights:

- `@typescript-eslint/no-explicit-any` is an error for TypeScript files.
- `no-console` is a warning generally, with targeted exceptions for scripts/tests/infrastructure files.
- React hooks recommended rules are enabled.
- OmniDash app names are restricted in specific dashboard surfaces; use contracts instead of hardcoded names.
- `OmniDashShell.tsx` must consume sidebar widget contracts rather than local NAV maps.

SonarQube/SonarCloud guidance:

- Prefer explicit statements over nested ternaries for multi-branch selection.
- Prefer portable globals (`globalThis`) where applicable.
- Keep code smells fixed in touched areas; do not silence rules without documented justification.
- Check `sonar-project.properties` before modifying coverage/exclusion behavior.

---

## 14. OmniDash and Dashboard Guardrails

High-risk files and concepts:

- `apps/omnihub-site/dashboard/OmniDashShell.tsx`
- `apps/omnihub-site/dashboard/DraggableWidget.tsx`
- `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`
- `src/contracts/omnidash.contract.ts`

Rules:

- Do not hardcode OmniDash app/module names in restricted dashboard surfaces; use existing contracts.
- Preserve `data-testid` attributes used by Playwright/Vitest unless tests are updated in the same change.
- Drag behavior in `DraggableWidget` uses threshold and localStorage persistence. Changes should include pointer/drag test coverage when feasible.
- Post-auth interactions should remain inside OmniDash/modals/PiP unless the route architecture is intentionally changed.

---

## 15. Supabase Edge Functions and Serverless Code

Verified function areas:

- `supabase/functions/*` — Supabase Edge Functions.
- `functions/api/*` — API function handlers.
- `api/*` — API middleware/routes.

Rules:

- Supabase Edge Functions may run in Deno-like environments; do not assume Node APIs are available.
- Cloudflare/Workers-style code may rely on Web Crypto and web-standard `fetch`/`Request`/`Response`.
- Do not use Node `Buffer`, filesystem, or process APIs in edge/runtime code unless the target runtime supports them and tests prove it.
- Keep CORS and auth checks explicit.
- Never weaken webhook signature verification or JWT validation to make tests pass.

---

## 16. Database, Migrations, and RLS

Migration directories:

- `supabase/migrations/`
- `supabase/migrations/rollback/`

Rules:

- Treat migration changes as high-risk.
- Verify existing table/policy/function names with `rg` before authoring SQL.
- Keep migrations additive when possible.
- Do not drop tables, columns, policies, or indexes without an explicit rollback strategy and user approval.
- For RLS changes, run or recommend security/RLS posture checks where applicable, such as `scripts/security/check_rls_posture.sh` if relevant.

---

## 17. Python and Orchestrator Areas

Verified Python config:

- `pyproject.toml` configures Ruff with Python 3.11 target and line length 88.
- Root package scripts run Python checks inside `orchestrator/`.

Rules:

- Do not assume `orchestrator/`, `services/orchestrator/`, and `src/core/orchestrator/` are the same runtime.
- Use Ruff for lint/format consistency.
- Keep security-sensitive code explicit; avoid broad exception swallowing.
- If a Python command fails because `orchestrator/` dependencies are missing, report the missing dependency/environment issue.

---

## 18. Mobile / Capacitor

Verified `capacitor.config.ts`:

- `appId`: `com.apexbusiness.omnilink`
- `appName`: `OmniLink`
- `webDir`: `dist`
- Push notification presentation options: badge, sound, alert.

Rules:

- Web changes affecting mobile must still build into `dist` before Capacitor sync/build.
- Do not edit generated Android/iOS artifacts unless the mobile task requires it.
- If changing PWA/static assets, check `public/manifest.webmanifest`, icons, `public/sw.js`, redirects, and headers as relevant.

---

## 19. Security and Compliance Guardrails

Never commit or expose:

- Service-role keys.
- Private keys or mnemonics.
- JWT signing secrets.
- Stripe/webhook secrets.
- OAuth client secrets.
- Raw production customer data.

Before committing, consider running:

```bash
npm run secret:scan
```

For security-sensitive changes:

- Prefer deny-by-default behavior.
- Preserve audit trails and error context without leaking sensitive data.
- Do not bypass auth, RLS, CORS, CSP, rate limits, or signature checks without explicit authorization.
- Document any accepted risk in the relevant security/audit docs.

---

## 20. Git and PR Workflow for Agents

Before edits:

```bash
git status --short --branch
```

During edits:

- Keep diffs focused.
- Do not overwrite user changes.
- If unexpected modified files exist, inspect before touching them.
- Commit only files related to the requested task.

Commit guidance:

- Existing commitlint allows conventional commits and ignores non-conventional first lines, but prefer clear conventional commits unless instructed otherwise.
- If a user provides an exact commit message, use it exactly.
- If the environment has no git remote, commit locally and report that push cannot be completed from this checkout.

After edits:

```bash
git diff --check
git status --short --branch
```

Run the smallest relevant validation suite and report all commands exactly.

---

## 21. Response Contract for Claude/Agents

For code changes, final responses should include:

1. **Diagnosis** — what was wrong or missing.
2. **Solution** — what changed and why.
3. **Code** — key files changed, with paths.
4. **Verification** — exact commands and pass/fail/environment-limited status.
5. **Next Action** — one explicit action.

Never state that tests passed unless they were executed successfully.

---

## 22. Hallucination Prevention Checklist

Before answering or editing, ask:

- Did I verify the file path exists?
- Did I inspect the relevant config instead of relying on memory?
- Did I search for call sites before changing exported names or contracts?
- Did I avoid claiming current status from stale dated docs?
- Did I avoid exposing secrets or creating browser access to server-only env vars?
- Did I run the relevant validation, or clearly state why I could not?
- Did I keep the patch within scope?

If any answer is “no,” stop and verify before proceeding.

---

## 23. Fast Triage Recipes

### Build failure after env changes

1. Inspect `scripts/check-env-root.mjs`.
2. Inspect `vite.config.ts` `loadEnv` and `define` blocks.
3. Inspect `apps/omnihub-site/src/lib/supabase.ts`.
4. Run `npm run typecheck`.
5. Run `npm run build` if environment permits.

### Authenticated E2E failure

1. Inspect `tests/e2e-playwright/helpers/auth.ts`.
2. Confirm `VITE_SUPABASE_URL`/`SUPABASE_URL` and browser-safe key env vars exist.
3. Confirm Playwright browsers are installed with `npm run test:e2e:install` if launch fails.
4. Run the specific spec with `CI=1 npx playwright test <spec> --project=chromium`.

### OmniDash selector/test failure

1. Inspect the component for role/name or `data-testid` selectors.
2. Inspect related contracts before hardcoding module names.
3. Prefer accessible selectors first, `data-testid` second.
4. Update tests and component in the same patch if selector contract intentionally changes.

### React duplicate/context failure

1. Run `npm run check:react`.
2. Inspect Vite/Vitest alias and dedupe config.
3. Do not add nested React dependencies or import React from app-local `node_modules`.

### Docs pointer failure

1. Run `npm run docs:check`.
2. Fix broken file paths or stale anchors.
3. Do not remove doc checks to make CI pass.

---

## 24. Current Known Environment Notes

These are operational notes for agent sessions, not permanent product facts:

- This repository may be checked out without a configured git remote in some automation environments. Verify with `git remote -v` before claiming a push.
- Playwright tests may fail to launch if browser binaries are missing. The intended install command is `npm run test:e2e:install`.
- Network-dependent Supabase tests may skip or fail if Supabase Auth is unreachable from the runner.

Keep this section updated when environment assumptions change.
