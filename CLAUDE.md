# CLAUDE.md — APEX OmniHub Agent Operating Manual

**Purpose:** Root operating context for Claude/agent sessions. Prevents hallucination, unsafe edits, and untraceable changes.
**Last verified:** 2026-05-28 · main @ `a54bd7c` (release-verification remediation on branch `claude/keen-volta-wgdjf`, pending merge)
**Critical rule:** Facts not verified from this file or an explicit user instruction → mark `[UNVERIFIED]`. If this file conflicts with a subsystem file, read that file before acting.

**Self-update protocol (§28):** After every verified/validated workflow, append an entry to the §27 Completed Workflow Log and update affected fact tables in the relevant sections. Only write facts confirmed by direct code inspection or successful command output.

---

## §1 Non-Negotiable Rules

### 1.1 Truth
- Never invent paths, scripts, APIs, env vars, test results, migrations, or deployment behavior.
- Verify file existence with `find`/`rg` before referencing. Verify all call sites with `rg` before changing exported names.
- If behavior is inferred from code (not docs), say so. If a command was not run, say so. If a command fails due to environment limits, report the exact failure — do not reframe as a code failure.

### 1.2 Scope
- Smallest working change only. No opportunistic refactors.
- Do not delete files, rewrite history, rotate credentials, alter production schemas, or change auth/security posture unless explicitly requested.
- Do not add runtime dependencies without stating the performance/security/bundle tradeoff.
- Never log secrets or print full env values.

### 1.3 Code standards
- TypeScript: strict-compatible. No `any` — use `unknown`, typed interfaces, or generics.
- Never wrap imports in `try/catch`.
- Prefer explicit control flow over nested ternaries.
- Prefer `globalThis` for portable browser/global access.
- Comments: one concise line for non-obvious WHY only. No what/how/caller comments.
- Use existing stack primitives before adding abstractions.

---

## §2 Verified Repo Identity

| Fact | Value | Source |
|---|---|---|
| Package name | `apex-omnihub` | `package.json` |
| Package version | `1.6.0` | `package.json` (pending changeset) |
| Private | `true` | `package.json` |
| Module type | `type: module` | `package.json` |
| Node engine | `>=22 <25` | `package.json` |
| Frontend toolchain | Vite + `@vitejs/plugin-react-swc` | `vite.config.ts` |
| React runtime | React 18 | `package.json` |
| Mobile wrapper | Capacitor — `com.apexbusiness.omnilink` / `OmniLink` | `capacitor.config.ts` |
| E2E runner | Playwright | `playwright.config.ts` |
| Unit/integration runner | Vitest | `vitest.config.ts` |
| Python lint | Ruff, Python 3.11 target, line 88 | `pyproject.toml` |
| Changeset access | `restricted` | `.changeset/config.json` |
| Latest main commit | `a54bd7c` (2026-05-20) | git log |
| Production URL | `https://apexomnihub.icu` | `.github/workflows/release.yml` env |
| Cloudflare account ID | `0e1bce84773a0d1ce340145ea195e86f` | CI workflows (non-secret) |

Do not cite README snapshot counts as current — they drift. Recalculate if needed.

---

## §3 Canonical Documentation Map

Read before architecture-level changes:

| File | Authority |
|---|---|
| `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` | Canonical architecture map |
| `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` | Certification authority |
| `docs/project-status/CI_STATUS_POLICY.md` | CI status interpretation |
| `docs/DOCUMENTATION_RELEASE_INDEX.md` | Doc inventory + authority order |
| `docs/infrastructure/CI_RUNTIME_GATES.md` | Quality gates (canonical CI reference) |
| `docs/testing/README.md` | Test strategy |
| `docs/extensibility/PLUGIN_ARCHITECTURE.md` | Plugin architecture |
| `docs/api/EDGE_FUNCTIONS_REFERENCE.md` | Supabase edge function API |
| `docs/api/API_EXTENSION_GUIDE.md` | REST/WebSocket extension |
| `CONTRIBUTING.md` | Contribution workflow |
| `docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md` | CI guardrail remediation |

When editing docs: `npm run docs:check` validates links and code pointers.

---

## §4 Repository Topology

### Major directories

| Path | Runtime | Role / Caution |
|---|---|---|
| `src/` | TypeScript/Node | Shared libs, gateway, contracts, components, integrations |
| `apps/omnihub-site/src/` | React 18 | Main app — consumed by root `src/App.tsx` |
| `apps/omnihub-site/dashboard/` | React 18 | OmniDash shell/widgets — **high-risk**: test selectors + drag |
| `tests/` | Vitest/Playwright | All test suites |
| `tests/e2e-playwright/` | Playwright | E2E specs per `playwright.config.ts` |
| `supabase/functions/` | Deno-like | Supabase Edge Functions |
| `supabase/migrations/` | SQL | Schema migrations — **high-risk** |
| `functions/api/` | Node | API handlers outside Supabase tree |
| `api/` | Node | API middleware/routes |
| `orchestrator/` | Python/Temporal | **Temporal Worker** — `main.py` = worker lifecycle, `server.py` = HTTP dispatch |
| `services/orchestrator/` | Python/FastAPI | **HTTP API layer** — `api/routes.py` + `fsm.py`. Must NOT init Temporal workers |
| `omega/` | Python/stdlib | **APEX Resilience Protocol** — `engine.py` + `dashboard.py`. XSS-guarded via markupsafe. Independent process. |
| `apex-resilience/` | Python | Resilience framework, scripts, tests |
| `sim/`, `sandbox/` | Mixed | Simulation + sandbox tooling |
| `android/`, `ios/` | Capacitor | Mobile shells (generated) |
| `packages/` | Mixed | Package subtrees incl. infrastructure, sales |
| `terraform/environments/production/` | Terraform | IaC for production/shadow slot routing |
| `public/` | Static | PWA assets, manifest, SW, redirects, headers |
| `integration-harness/` | Node | Deterministic validator + CI harness |

### Path disambiguation (critical — most common hallucination source)

| Path | Runtime | Role |
|---|---|---|
| `orchestrator/` | Python / Temporal | Worker lifecycle + HTTP dispatch |
| `services/orchestrator/` | Python / FastAPI | HTTP API + deterministic FSM |
| `omega/` | Python / stdlib | Human-in-the-loop approval (independent) |
| `src/core/orchestrator/` | TypeScript | Frontend/gateway contract types ONLY |
| `src/omnihub-gateway/` | TypeScript / Node | Edge gateway, MCP client, routing |

---

## §5 App Entry and Routing

Chain (verified from source):
1. `index.html` → Vite app
2. `src/main.tsx` → React root, global styles, renders `src/App.tsx`
3. `src/App.tsx` → re-exports `apps/omnihub-site/src/App.tsx`
4. `apps/omnihub-site/src/App.tsx` → React Router routes, wraps OmniDash surface
5. `apps/omnihub-site/dashboard/OmniDashShell.tsx` → post-auth shell

Pre-auth routes: landing, login/auth, legal, request access, product/marketing.
Post-auth: OmniDash (guarded by `ProtectedRoute` + `OmniDashProvider`).
Do not create a second post-auth shell unless architecture explicitly changes.

---

## §6 Module Resolution Aliases

### TypeScript (`tsconfig.json`)
| Alias | Resolves to |
|---|---|
| `@/dashboard/*` | `./apps/omnihub-site/dashboard/*` |
| `@/*` | `./apps/omnihub-site/src/*` |

### Vite (`vite.config.ts`)
| Alias | Resolves to |
|---|---|
| `dashboard` | `./apps/omnihub-site/dashboard` |
| `@/dashboard` | `./apps/omnihub-site/dashboard` |
| `@` | `./apps/omnihub-site/src` |

In the Vite app, `@/...` means `apps/omnihub-site/src/...`. Do not re-point aliases to root `src/` without verifying Vitest + build behavior. If changing aliases: validate `npm run typecheck`, `npm run test`, and targeted imports.

---

## §7 Package Manager and Lockfile Policy

Lockfiles present: `package-lock.json`, `bun.lock`, `packages/infrastructure/bun.lock`.
Scripts in root `package.json` are npm-compatible. Playwright web server: `npm run build && npm run preview`.

- **Default:** use `npm run <script>` unless user explicitly requests Bun.
- Do not run any package-manager install command to make a task work.
- Do not modify lockfiles unless dependency changes are the requested task.
- If installation is necessary: state why, verify both package and lockfile diffs.

---

## §8 Core Commands

Run from repo root unless noted.

### Build / Dev
```bash
npm run dev           # Vite dev server — port 8080
npm run build         # Production build (runs prebuild first)
npm run build:dev     # Dev-mode build
npm run preview       # Vite preview — port 4173
npm run build:seo     # Sitemap then build
```

### Type / Lint / Docs
```bash
npm run typecheck     # tsc -p tsconfig.json --noEmit
npm run lint          # eslint .
npm run check:react   # React singleton check
npm run docs:check    # Broken link + code-pointer validation
```

### Tests
```bash
npm run test                  # Vitest full suite
npm run test:unit             # tests/lib
npm run test:integration      # tests/integration
npm run test:infra            # infrastructure tests
npm run test:assets           # static asset smoke
npm run test:prompt-defense   # prompt-defense suite
npm run test:e2e              # Playwright all projects
npm run test:e2e:ci           # Playwright chromium only
npm run test:e2e:install      # Install Playwright Chromium
```

### Python
```bash
npm run lint:py       # cd orchestrator && ruff check + format check
npm run format:py     # cd orchestrator && ruff format
npm run test:py       # cd orchestrator && pytest -q
npm run ci:py         # lint:py + test:py
```

### Security / Ops / Gates
```bash
npm run secret:scan           # Secret scanner
npm run security:audit        # npm audit → security/npm-audit-latest.json
npm run smoke-test            # Deployment smoke test
npm run guardian:status       # Guardian status
npm run omnilink:health       # OmniLink health check
npm run zero-trust:baseline   # Zero-trust baseline CLI
npm run dr:test               # Disaster recovery dry run
npm run ci:runtime-gates      # check:react + assets + infra + e2e
```

Only claim a gate passed if you ran it and saw exit code 0.

---

## §9 Environment Variables

### Public browser (VITE_* — exposed by Vite, treat as public-only)
| Name | Fallback name |
|---|---|
| `VITE_SUPABASE_URL` | `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` |

`scripts/check-env-root.mjs` validates presence before build (logs names only, never values).
`vite.config.ts` exposes only browser-safe Supabase vars + `VITE_IS_CI`.

### Server/admin (never expose to browser or `import.meta.env`)
```
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
```

### CI secrets (GitHub Actions only — never commit or log)
```
CLOUDFLARE_API_TOKEN
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_PUBLISHABLE_KEY
TF_TOKEN
```

---

## §10 Supabase and Auth

Verified frontend client: `apps/omnihub-site/src/lib/supabase.ts`
- `@supabase/supabase-js` `createClient`
- Prefers `VITE_SUPABASE_PUBLISHABLE_KEY`; falls back to `VITE_SUPABASE_ANON_KEY`
- PKCE auth flow; browser localStorage when `globalThis.window` exists

Auth context: `src/contexts/AuthContext.tsx` — checks Supabase URL + browser-safe key envs.

E2E auth helper: `tests/e2e-playwright/helpers/auth.ts`
- Creates real Supabase session via email/password or anonymous sign-in
- Seeds auth state into `globalThis.localStorage` via `page.addInitScript`
- Skips when Supabase config absent or unreachable

Do not replace real auth flows with fake tokens unless explicitly testing a mocked unit boundary.

---

## §11 Vite Build and Bundle Invariants

Verified `vite.config.ts`:
- Dev server: host `::`, port `8080`
- Preview: port `4173`
- `envPrefix: 'VITE_'`
- Build target: `es2020`
- Minification: `terser` with console/debugger removal
- React dedupe: `react`, `react-dom`
- Manual chunks: React, Web3, Radix UI, Supabase, charting, motion, i18n
- Node-only packages externalized from browser bundle

Rules: keep Node-only packages out of browser paths. Do not import server-only modules into React components. If changing chunking/externals: run `npm run build` and inspect warnings.

---

## §12 Testing Strategy

### Vitest
- Targeted specs for localized changes + `npm run typecheck`
- Shared lib / contract changes: narrow target + typecheck
- React component changes: include relevant component tests

### Playwright (`playwright.config.ts`)
- Test dir: `tests/e2e-playwright`
- Base URL: `BASE_URL` env or `http://localhost:4173`
- Web server: `npm run build && npm run preview`
- CI: `chromium`, `mobile-chrome`; Local also: Firefox, mobile Safari, iPad
- Traces: first retry; screenshots: failure only

Rules:
- Missing browser binaries: `npm run test:e2e:install` (not a code failure)
- Authenticated E2E: use `tests/e2e-playwright/helpers/auth.ts` unless testing login UI
- Selectors: role/name or `data-testid`; no brittle CSS chains

### Environment-limited failures
Capture exact command + exact blocker. Mark as environment limitation. Do not claim behavior passed.

---

## §13 ESLint and SonarCloud

ESLint enforced:
- `@typescript-eslint/no-explicit-any` → error
- `no-console` → warning (exceptions: scripts/tests/infra files)
- React hooks rules enabled
- OmniDash app names restricted in dashboard surfaces — use contracts
- `OmniDashShell.tsx` must consume sidebar widget contracts (not local NAV maps)

SonarCloud rules:
- Explicit statements over nested ternaries
- Prefer `globalThis` for portability
- No `${{ github.event.* }}` in `run:` blocks — use `env:` vars to prevent script injection
- Check `sonar-project.properties` before modifying coverage/exclusion

---

## §14 OmniDash and Dashboard Guardrails

High-risk files:
- `apps/omnihub-site/dashboard/OmniDashShell.tsx`
- `apps/omnihub-site/dashboard/DraggableWidget.tsx`
- `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`
- `src/contracts/omnidash.contract.ts`

Rules:
- Never hardcode OmniDash app/module names in restricted dashboard surfaces — use existing contracts
- Preserve `data-testid` attributes unless tests updated in same change
- `DraggableWidget`: threshold + localStorage persistence — changes need pointer/drag test coverage
- Post-auth interactions stay inside OmniDash/modals/PiP unless architecture explicitly changes

---

## §15 Supabase Edge Functions and Serverless

Areas:
- `supabase/functions/*` — Supabase Edge Functions (Deno-like runtime)
- `functions/api/*` — API handlers (outside Supabase tree)
- `api/*` — API middleware/routes

Rules:
- Edge Functions: do not assume Node APIs. Web Crypto + web-standard `fetch`/`Request`/`Response` only.
- No Node `Buffer`, filesystem, or `process` APIs in edge/runtime code.
- Keep CORS and auth checks explicit.
- Never weaken webhook signature verification or JWT validation to pass tests.

---

## §16 Database, Migrations, and RLS

Migration dirs: `supabase/migrations/`, `supabase/migrations/rollback/`

Rules:
- Migration changes = high-risk. Verify existing table/policy/function names with `rg` first.
- Keep migrations additive. No drops without explicit rollback strategy + user approval.
- RLS changes: run `scripts/security/check_rls_posture.sh` where applicable.

---

## §17 Python and Orchestrator

Config: Ruff, Python 3.11 target, line length 88 (`pyproject.toml`). Scripts run checks inside `orchestrator/`.

Rules:
- The five Python areas are distinct runtimes — never conflate (see §4 disambiguation table).
- Use Ruff for lint/format.
- No broad exception swallowing in security-sensitive code.
- Missing `orchestrator/` deps → report missing dep, not a code failure.

---

## §18 Mobile / Capacitor

`capacitor.config.ts`: `appId=com.apexbusiness.omnilink`, `appName=OmniLink`, `webDir=dist`, push: badge/sound/alert.

Rules:
- Web changes affecting mobile: must build into `dist` before Capacitor sync/build.
- Do not edit generated Android/iOS artifacts unless mobile task requires it.
- PWA/static asset changes: check `public/manifest.webmanifest`, icons, `public/sw.js`, redirects, headers.

---

## §19 Security and Compliance Guardrails

Never commit or expose: service-role keys, private keys/mnemonics, JWT secrets, Stripe/webhook secrets, OAuth client secrets, raw production customer data.

Pre-commit: `npm run secret:scan`

Security-sensitive changes:
- Deny-by-default behavior
- Preserve audit trails without leaking sensitive data
- Do not bypass auth, RLS, CORS, CSP, rate limits, or signature checks without explicit authorization
- Document accepted risk in `docs/security/SECURITY_ADVISORIES.md`

---

## §20 Git and PR Workflow

Pre-edit: `git status --short --branch`
Post-edit: `git diff --check && git status --short --branch`

Commit rules:
- Focused diffs only. Commit only task-related files.
- Conventional commits preferred. Use exact message if user provides one.
- No `--no-verify`, no `--amend` to fix hook failures (create new commit).
- No force-push to main.

PR rules:
- After push: always create a draft PR if none exists.
- Stage specific files (not `git add .` or `git add -A`) to avoid accidental secret/binary inclusion.

---

## §21 Response Contract

For code changes:
1. **Diagnosis** — what was wrong or missing
2. **Solution** — what changed and why
3. **Code** — key files changed with paths
4. **Verification** — exact commands + pass/fail/env-limited status
5. **Next Action** — one explicit action

Never claim tests passed unless exit code 0 was observed.

---

## §22 Hallucination Prevention Checklist

Before acting, confirm:
- [ ] File path verified to exist?
- [ ] Config inspected (not recalled from memory)?
- [ ] Call sites searched before changing exported names?
- [ ] Not citing status from stale dated docs?
- [ ] No secrets or server env vars exposed to browser?
- [ ] Validation run (or explicitly stated why not)?
- [ ] Patch within scope?

If any is "no" — stop and verify first.

---

## §23 Fast Triage Recipes

### Build failure after env changes
1. `scripts/check-env-root.mjs`
2. `vite.config.ts` → `loadEnv` + `define` blocks
3. `apps/omnihub-site/src/lib/supabase.ts`
4. `npm run typecheck`
5. `npm run build` (if env permits)

### Authenticated E2E failure
1. `tests/e2e-playwright/helpers/auth.ts`
2. Confirm `VITE_SUPABASE_URL` + browser-safe key vars exist
3. `npm run test:e2e:install` if browser launch fails
4. `CI=1 npx playwright test <spec> --project=chromium`

### OmniDash selector/test failure
1. Component: check role/name or `data-testid` selectors
2. Read related contracts before hardcoding module names
3. Update tests + component in same patch if selector contract changes

### React duplicate/context failure
1. `npm run check:react`
2. Check Vite/Vitest alias + dedupe config
3. Do not add nested React deps or import React from app-local `node_modules`

### Docs pointer failure
1. `npm run docs:check`
2. Fix broken paths or stale anchors
3. Do not remove doc checks to make CI pass

### SonarCloud script injection failure
Symptom: E Security Rating on new code for `run:` block using `${{ github.event.* }}`.
Fix: Move the expression to `env:` block; reference as `$ENV_VAR_NAME` in shell.
Alternative: Read from git directly (`git log -1 --format="%s"`) instead of event payload.

### Release workflow not triggering shadow deploy
Symptom: `release_cut=false` on a version PR merge.
Check: `git log -1 --format="%s"` on the merge commit — must contain `"chore: version packages"`.
Check: `steps.changesets.outputs.published` — should be `'true'` for public repos.
See: `.github/workflows/release.yml` → `release_signal` step.

---

## §24 Environment Notes (Operational, Non-Permanent)

- Repository may be checked out without a git remote in some automation environments. Verify with `git remote -v` before claiming a push.
- Playwright tests may fail if browser binaries missing. Install: `npm run test:e2e:install`.
- Network-dependent Supabase tests may skip/fail if Auth is unreachable from runner.
- CI ECONNRESET on `npm ci` / `bun install`: transient GitHub Actions network failure — push a retrigger commit.

---

## §25 Release Workflow Architecture

**File:** `.github/workflows/release.yml` — triggers on `push` to `main`.

### Changesets and private-package detection

`changesets/action` creates a version PR (`chore: version packages`) or publishes. For `"private": true` repos, `published` is always `'false'` — npm publish is a no-op.

**`release_signal` step** (id: `release_signal`) decouples shadow deployment from npm publish:
```yaml
env:
  CHANGESETS_PUBLISHED: ${{ steps.changesets.outputs.published }}
run: |
  if [ "$CHANGESETS_PUBLISHED" = "true" ]; then
    echo "release_cut=true" >> "$GITHUB_OUTPUT"
  elif git log -1 --format="%s" | grep -qF "chore: version packages"; then
    echo "release_cut=true" >> "$GITHUB_OUTPUT"
  else
    echo "release_cut=false" >> "$GITHUB_OUTPUT"
  fi
```
Note: reads commit subject via `git log` (not `github.event.head_commit.message`) to prevent script injection.

All 5 shadow deployment gates use `steps.release_signal.outputs.release_cut == 'true'`.

### Release evidence
`scripts/ci/write-release-evidence.mjs` writes `release-evidence.json`. Key env vars: `RELEASE_CUT_RAW`, `PUBLISHED_RAW`, `SHADOW_URL_RAW`, `HEALTH_RAW`, `VALIDATOR_RAW`, `TF_RESULT_RAW`, `TF_OUTCOME_RAW`.

**Verdict enum:**
| Value | Meaning |
|---|---|
| `CERTIFIED` | Release cut + shadow health + validator + terraform all pass |
| `CERTIFICATION_PENDING_FINAL_MAIN_CI` | Gates pass; terraform skipped |
| `NOT_CERTIFIED_NO_RELEASE_CUT` | `release_cut != 'true'` (non-release push) |
| `NOT_CERTIFIED_BLOCKED` | Release cut but a gate failed |

### Shadow certification sequence
`release_cut=true` → `shadow_preflight` (pass required) → shadow deploy to `apex-omnihub-shadow` → `/health` poll (10×10s) → `deterministic-validator.mjs` → Terraform plan → `production-shadow` env reviewer approves → Terraform apply → `write-release-evidence.mjs`.

---

## §26 Cloudflare and Shadow Deployment Facts

| Key | Value |
|---|---|
| Production CF Pages project | `apex-omnihub` |
| Production URL | `https://apexomnihub.icu` |
| Shadow CF Pages project | `apex-omnihub-shadow` |
| Shadow health URL | `https://apex-omnihub-shadow.pages.dev/health` |
| CF account ID | `0e1bce84773a0d1ce340145ea195e86f` (non-secret) |
| GitHub Environment | `production-shadow` (required-reviewer protection) |
| Terraform path | `terraform/environments/production/` |

Required GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `TF_TOKEN`.
Required GitHub vars: `CLOUDFLARE_SHADOW_PROJECT_NAME=apex-omnihub-shadow`, `ENABLE_SHADOW_DEPLOYMENT=true`, `ENABLE_ATOMIC_ROUTING_FLIP=true`, `SHADOW_HEALTH_URL=https://apex-omnihub-shadow.pages.dev/health`.

Shadow preflight: `scripts/ci/shadow-certification-preflight.mjs` — writes `shadow-preflight.json`.
Evidence artifact: `release-evidence.json` + `shadow-preflight.json` (retained 90 days).

Cert blockers (as of 2026-05-20):
- B-1 RESOLVED 2026-05-20 — shadow slot provisioned, all secrets/vars set
- B-2 STRUCTURAL FIX MERGED 2026-05-20 (PR #1185, `a54bd7c`) — evidence pending changesets version PR
- B-3 RESOLVED 2026-05-20 — `production-shadow` GitHub Environment created

---

## §27 Completed Workflow Log

Append an entry here after every agent-completed, verified workflow. Format: `YYYY-MM-DD | PR# / commit | Description | Key changed files`.

| Date | Ref | Description | Key files |
|---|---|---|---|
| 2026-05-20 | PR #1184 / `2310ed0` | Shadow slot provisioned, coverage floors raised, omega/orchestrator topology canonicalised, docs audited | `.github/workflows/release.yml`, `vitest.config.ts`, `omega/`, `services/orchestrator/`, docs/ |
| 2026-05-20 | commit `16c1425` | 8 stale docs permanently deleted (CHANGELOG logged first): `CICD_PIPELINE_DESIGN.md`, `DEPLOYMENT_ROLLOUT_PLAN.md`, `PRODUCTION_ROLLOUT_PLAN.md`, `APEX_ECOSYSTEM_STATUS.md`, `PRODUCTION_STATUS.md` + 3 archive copies | `docs/infrastructure/`, `docs/project-status/`, `docs/archive/`, `CHANGELOG.md` |
| 2026-05-20 | PR #1185 / `a54bd7c` | B-2 structural fix: decouple shadow deployment from npm publish for private packages; SonarCloud script injection fix | `.github/workflows/release.yml`, `scripts/ci/write-release-evidence.mjs` |
| 2026-05-20 | PR #1187 / `191e547` | Certification status updated: B-2 structural fix documented, path-to-certified updated | `docs/project-status/PRODUCTION_CERTIFICATION_STATUS.md` |
| 2026-05-23 | commit (branch) | Omni-Recall continuity system installed at `memory/omni-recall/`; session-load hook added to §29; all stale GPT-workspace paths corrected; full blueprint folder shape created | `memory/omni-recall/`, `CLAUDE.md` |
| 2026-05-28 | branch `claude/keen-volta-wgdjf` | AG2 18-prompt handoff remediation: replaced 4 no-op fake-pass verify gates with real scanners; emptied `verify-release` silent-failure allowlist; remediated all 11 CodeQL alerts + 1 project TS error; cleared 4 Dependabot advisories via overrides; PhysiOmni partition-RLS migration; honest release docs (100/100 verified — tsc/eslint/ruff/Vitest 2553/pytest 919/build/e2e 22/assets/gates all exit 0) | `scripts/ci/verify-*.mjs`, `.github/workflows/*`, `supabase/migrations/20260528000000_*`, `docs/release/*`, `package.json`, lockfiles, `src/`, `tests/`, `memory/omni-recall/` |

---

## §28 CLAUDE.md Self-Update Protocol

**When to update this file:**
- After a PR merges that changes repo structure, commands, env vars, paths, or CI behavior
- After new secrets/variables are set in GitHub (record names only, never values)
- After certification state changes (B-1/B-2/B-3 in §26)
- After new architectural facts are verified from source (not from docs)

**How to update:**
1. Add a row to §27 Completed Workflow Log
2. Update the affected fact table in the relevant section
3. Update `Last verified:` date and `main @` commit in the header
4. Commit with message: `docs(claude): update agent operating context [YYYY-MM-DD]`
5. Do NOT add speculative or unverified facts — mark anything uncertain as `[UNVERIFIED]`

**What NOT to add:**
- Contents of other docs (link to them instead)
- Operational decisions that belong in CHANGELOG or PR descriptions
- Facts that may change frequently (PR numbers, CI run IDs)
- Hallucinated command options or file paths

---

## §29 Omni-Recall Continuity System

**Canonical path:** `memory/omni-recall/` (within this repo)
**Installed:** 2026-05-23
**Entry point:** `memory/omni-recall/start-here.md`

### What it is

Omni-Recall is the durable memory and continuity system for this workspace. It stores user preferences, corrections, project knowledge, and operating rules that should persist across sessions.

### Session bootstrap

At the start of any session where continuity matters, read in this order:
1. `memory/omni-recall/CLAUDE.md`
2. `memory/omni-recall/user-operating-model.md`
3. `memory/omni-recall/quality-bar.md`
4. `memory/omni-recall/do-not-do.md`
5. `memory/omni-recall/omni-recall-master-blueprint-2026-05-23.md`

### Persistence mechanism

This runtime uses git commits + push as the only durable storage. Omni-Recall files in `memory/omni-recall/` survive across container instances only if committed and pushed.

### Operating contract

- Quiet by default — only surface real drift, conflict, risk, or decisions
- Corrections go to `memory/omni-recall/wiki/corrections/` and propagate to canonical pages
- Historical backfill: pending external exports (Phase 2)
- Do not imply access to history not available through repo, uploads, or connected tools
