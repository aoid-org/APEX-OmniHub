# APEX OmniHub — Agent & Developer Briefing

**Canonical reference for all Claude Code agents and new contributors.**
When any other document conflicts with this file, treat this file as authoritative
unless a newer dated `CANONICAL_TRUTH.md` entry explicitly supersedes it.

---

## 1. What This Repo Is

APEX OmniHub is a **Universal Sync Orchestrator** — an enterprise AI orchestration
platform with governed execution across TypeScript, Python, SQL, and Web3 layers.

```
Platform version:  1.5.1
Primary language:  TypeScript (React 18 + Vite 7)
Orchestrator:      Python (Temporal.io)
Database/Edge:     Supabase (PostgreSQL + Edge Functions)
CDN/Hosting:       Cloudflare Pages
```

**Runtime topology:**

| Layer | Location | Language |
|---|---|---|
| Frontend (OmniDash) | `apps/omnihub-site/src/` | TypeScript / React |
| Frontend shim | `src/App.tsx` | re-exports from `apps/omnihub-site/` |
| Edge functions | `supabase/functions/` | TypeScript (Deno) |
| Orchestrator | `orchestrator/` | Python 3.11+ (Temporal) |
| Infra-as-code | `terraform/` | HCL |
| Mobile | `android/`, `ios/` | Capacitor wrappers |

---

## 2. Package Manager — DO NOT GUESS

**Primary package manager: `bun`**
**npm is used ONLY for `npm audit`.**

```bash
# CORRECT — install dependencies
bun install

# CORRECT — frozen install (CI / after lockfile changes)
bun install --frozen-lockfile

# WRONG — do not use for installs
npm install        # ❌ do not use
npm ci             # ❌ do not use
yarn install       # ❌ do not use
pnpm install       # ❌ do not use
```

**Lockfile policy (both files are committed):**

| File | Purpose | Authoritative for |
|---|---|---|
| `bun.lock` | bun's native lockfile | All installs (human + CI) |
| `package-lock.json` | npm lockfile | `npm audit` in CI only |

Both lockfiles must stay committed. The CI `Security Gates` and `Dependency Security Audit`
workflows call `npm audit --omit=dev --audit-level=high`, which requires `package-lock.json`
to be present in the checkout — it cannot be gitignored.

**If you see `ENOLOCK` in CI:** `package-lock.json` was deleted or gitignored. Restore it.

---

## 3. Runtime Requirements

```
Node.js:  >= 20.19.0  (CI uses Node 20)
Bun:      >= 1.2.14   (CI uses bun 1.2.14)
```

These are hard requirements enforced in `package.json#engines`.

---

## 4. All Verified Commands

Run these from the repo root. Every name is the exact `package.json` script key.

### Development
```bash
bun run dev              # Start dev server → http://localhost:8080
bun run build            # Production build → dist/
bun run preview          # Preview production build → http://localhost:4173
```

### Quality Gates (run before every commit)
```bash
bun run typecheck        # TypeScript — must produce zero errors
bun run lint             # ESLint — must produce zero warnings (--max-warnings 0)
bun run check:react      # React singleton check (one React version only)
bun run check:drift      # Repo drift guard (runtime, headers, OmniDash shims, replay ordering, docs claims)
bun run test             # Full Vitest suite (~2400 tests, ~70-90s)
bun run docs:check       # Doc link + file-pointer integrity check
bun run build            # Production build must succeed
```

### Testing (specific scopes)
```bash
bun run test:unit        # Unit tests only (tests/lib)
bun run test:integration # Integration tests
bun run test:e2e         # Playwright E2E (requires bun run test:e2e:install first)
bun run test:e2e:install # Install Playwright Chromium
bun run test:assets      # Asset reachability smoke check
bun run test:infra       # Infrastructure tests
bun run test:prompt-defense  # Prompt injection defense tests
bun run test:py          # Python orchestrator pytest suite
```

### Security
```bash
npm audit --omit=dev --audit-level=high  # Production dep audit (exits 0 = clean)
bun run secret:scan      # Secret scanning (gitleaks wrapper)
bun run security:audit   # Full npm audit → security/npm-audit-latest.json
```

### Python (orchestrator)
```bash
bun run lint:py          # Ruff lint + format check (orchestrator/)
bun run format:py        # Ruff autoformat
bun run ci:py            # lint:py + test:py (CI equivalent)
```

### Operations
```bash
bun run smoke-test       # Post-deploy smoke tests
bun run guardian:status  # Guardian agent health check
bun run omnilink:health  # OmniLink connectivity check
bun run dr:test          # Disaster recovery dry run
```

---

## 5. Architecture Invariants — DO NOT BREAK

### 5.1 Path Alias Split (load-bearing)

The `@/*` alias resolves to **different locations** depending on context.
This is intentional and must not be "aligned" or "fixed."

| Context | `@/*` resolves to |
|---|---|
| `vite.config.ts` (app build) | `./apps/omnihub-site/src/*` |
| `tsconfig.json` (TypeScript) | `./apps/omnihub-site/src/*` |
| `vitest.config.ts` (tests) | `./src/*` (root package) |

The test suite imports root-package modules via `@/`; the app imports
`omnihub-site` modules via `@/`. The split is **load-bearing for test isolation**.
The `@/dashboard/*` alias always resolves to `./apps/omnihub-site/dashboard/*` in
both contexts.

### 5.2 tsconfig.json Must Be Valid JSON — No Comments

`platform-quality-gates.test.ts` parses `tsconfig.json` with `JSON.parse()`.
Standard JSON does not allow `//` or `/* */` comments.

```jsonc
// ❌ WILL BREAK Gate 6 (TypeScript strict mode test)
{
  "compilerOptions": {
    // This comment breaks JSON.parse
    "strict": true
  }
}
```

```json
// ✅ CORRECT — pure JSON, no comments
{
  "compilerOptions": {
    "strict": true
  }
}
```

### 5.3 `ignoreDeprecations` Must Be `"5.0"`, Not `"6.0"`

TypeScript 5.x only accepts `"5.0"` as a valid `ignoreDeprecations` value.
`"6.0"` causes `TS5103: Invalid value` and breaks every CI gate that runs `tsc`.

```json
"ignoreDeprecations": "5.0"   // ✅ correct
"ignoreDeprecations": "6.0"   // ❌ breaks build — TS 6.0 does not exist
```

### 5.4 Repo Drift Guard — Mandatory Before PRs

`bun run check:drift` is the repo-wide anti-regression gate. It fails closed when any of these invariants drift:

- React/React DOM declarations leave the canonical 18.3.1 runtime.
- Nested `apps/omnihub-site` lockfiles reappear instead of using root lockfile authority.
- Legacy OmniDash files under `apps/omnihub-site/src/components/omnidash/` become implementations instead of compatibility re-exports to `apps/omnihub-site/dashboard/components/`.
- Root deployment headers weaken COOP or add `'unsafe-inline'` to `script-src`.
- OmniBridge replay-store checks move before signature verification.
- Generated artifacts (`output.txt`, `logs.txt`, `*.pyc`, `__pycache__/`) become tracked.
- Active docs use certification/global-rollout language without evidence-led status framing.

Run it before opening or updating every PR. If it fails, fix the invariant rather than bypassing the script.

### 5.5 Single React Instance

There must be exactly one React instance loaded at runtime. The `check:react`
script enforces this. Do not add secondary React dependencies in sub-packages.
`vite.config.ts` and `vitest.config.ts` both use `dedupe: ['react', 'react-dom']`
to enforce this.

### 5.6 CSP Policy — No `unsafe-inline` in `script-src`

`public/_headers` enforces:
```
Content-Security-Policy: ... script-src 'self'; ...
```
Do not add `'unsafe-inline'` to `script-src`. All scripts must be
self-hosted and bundled by Vite.

### 5.7 OmniLink Single Port Rule

All OmniLink traffic flows through port `9876`. Do not add
alternative ports or bypass this constraint.

---

## 6. CI Gates — What Passes, What Blocks Merge

### Gates that MUST pass before merge to `main`

| Check name | Workflow | What it verifies |
|---|---|---|
| `architectural-boundary-enforcement` | `ci-runtime-gates.yml` | Worker/API purity, metrics decoupling |
| `terraform-expression-drift-gate` | `ci-runtime-gates.yml` | Terraform expressions unchanged |
| `build-and-test` | `ci-runtime-gates.yml` | Changelog paths, repo/drift hygiene, TSC, ESLint, React singleton, tests, build |
| `quality-gates` | `production-readiness.yml` | TSC, ESLint, tests, docs:check, SPA redirect file |
| `security-gates` | `production-readiness.yml` | TruffleHog secrets scan, npm audit (high/critical), security posture |
| `rls-posture-gate` | `orchestrator-ci.yml` | Supabase RLS coverage on all tables |
| `ruff-gate` | `orchestrator-ci.yml` | Python ruff lint |
| `legal-drift-gate` | `orchestrator-ci.yml` | License/legal file integrity |
| `claims-proof-gate` | `orchestrator-ci.yml` | Claims evidence present |

### Gates that are advisory (do not block merge alone)

| Check name | Notes |
|---|---|
| `Lighthouse Audit` | Performance score; advisory |
| `sonarcloud-gate` | SonarCloud quality gate; passes independently |
| `Code Quality Gates` | `security-regression-guard.yml` — runs TSC + tests + build |
| `Dependency Security Audit` | `security-regression-guard.yml` — runs npm audit + Python lockfile check |

### `security-gates` requires same-repo PRs

The Security Gates job has an `if` condition that skips it for fork PRs:
```yaml
if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
```
This is intentional — forks cannot access secrets needed for TruffleHog.

### `Production Readiness Summary` is downstream

`Production Readiness Summary` fails only because `security-gates` or `quality-gates`
failed. Fix the root gate, not the summary.

---

## 7. Known CI Pitfalls (Verified Root Causes)

| Symptom | Root cause | Fix |
|---|---|---|
| `ENOLOCK` in `npm audit` | `package-lock.json` not committed | Restore file: `git add package-lock.json` |
| `TS5103: Invalid value for --ignoreDeprecations` | Value set to `"6.0"` | Change to `"5.0"` in both tsconfig files |
| `SyntaxError: Expected double-quoted property name` in Gate 6 | `//` comment in `tsconfig.json` | Remove all comments from `tsconfig.json` |
| React context undefined / `createContext` error | Multiple React instances | Run `bun run check:react`; check `dedupe` in vite/vitest config |
| `security-gates` failing in < 30s | TruffleHog or npm audit failing early | Check TruffleHog scan output; verify `package-lock.json` exists |
| Coverage race condition (ENOENT) | Coverage enabled by default | Only enable via `VITEST_COVERAGE=true` or `bun run test:coverage` |

---

## 8. Repo Structure (Key Paths)

```
APEX-OmniHub/
├── CLAUDE.md                         ← This file (agent briefing)
├── CHANGELOG.md                      ← Conventional changelog (required for CI)
├── package.json                      ← Root package (version 1.5.1, engines field)
├── bun.lock                          ← Authoritative install lockfile
├── package-lock.json                 ← Required for npm audit in CI
├── vite.config.ts                    ← Vite build config (alias: @ → omnihub-site/src)
├── vitest.config.ts                  ← Test config (alias: @ → ./src root)
├── tsconfig.json                     ← Root TS config (MUST be pure JSON, no comments)
├── tsconfig.app.json                 ← App TS config
├── tsconfig.node.json                ← Node tools TS config
├── .github/workflows/                ← All CI/CD workflows
├── apps/omnihub-site/                ← Primary web application
│   ├── src/                          ← React app source (aliased as @ in app build)
│   ├── dashboard/                    ← OmniDash components (aliased as @/dashboard)
│   └── public/                       ← Static assets for omnihub-site
├── src/                              ← Root package source (aliased as @ in tests)
│   ├── security/                     ← securityAuditLogger.ts, promptDefense.ts
│   └── App.tsx                       ← Shim re-exporting apps/omnihub-site/src/App.tsx
├── public/                           ← Root static assets (served by Vite)
│   ├── _headers                      ← Cloudflare Pages CSP + security headers
│   ├── _redirects                    ← SPA fallback routing (MUST exist)
│   ├── sitemap.xml                   ← SEO sitemap (lastmod updated on release)
│   └── robots.txt
├── supabase/
│   ├── functions/                    ← Edge functions (22 directories)
│   └── migrations/                   ← Versioned SQL migrations
├── orchestrator/                     ← Python Temporal worker
│   ├── main.py                       ← Worker entry point
│   ├── server.py                     ← FastAPI metrics/health endpoint
│   ├── requirements.in               ← Python dependency source
│   ├── requirements.lock             ← Compiled Python lockfile (MUST stay committed)
│   └── requirements.txt              ← Runtime subset
├── tests/                            ← TypeScript test suites (~2400 tests)
│   └── quality/platform-quality-gates.test.ts  ← Parses tsconfig.json with JSON.parse
├── scripts/                          ← CI, DR, security, quality utilities
├── docs/                             ← Architecture, runbooks, compliance, audits
│   ├── onboarding/DEVELOPER_ONBOARDING.md
│   ├── infrastructure/CI_RUNTIME_GATES.md
│   ├── infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md
│   ├── ops/OPS_RUNBOOKS_CI_GUARDRAILS.md
│   ├── ops/INCIDENT_RESPONSE.md
│   └── architecture/CANONICAL_TRUTH.md  ← Conflict resolution authority
├── terraform/                        ← Infrastructure as code
├── android/, ios/                    ← Capacitor mobile wrappers
└── sim/                              ← Chaos simulation harness
```

---

## 9. Git Workflow

### Branch naming
```
feature/<description>      # New features
fix/<description>          # Bug fixes
chore/<description>        # Maintenance, no behavior change
claude/<scope>-<hash>      # Agent-created branches (auto-named by harness)
```

### Commit message format (Conventional Commits — enforced by commitlint)
```
<type>(<scope>): <description>

Types: feat | fix | chore | refactor | ci | docs | test | perf | build
```

Examples:
```
feat(omnidash): add realtime subscription to dashboard widgets
fix(tsconfig): revert ignoreDeprecations to "5.0" — invalid in TS 5.x
chore(gitignore): ignore auto-generated security posture reports
```

### Pre-commit checklist
```bash
bun run typecheck   # zero errors
bun run lint        # zero warnings
bun run test        # all pass
bun run build       # succeeds
```

### Merge requirements
- All required CI gates green (see §6)
- ≥ 1 approving review
- Branch up to date with `main`
- All review conversations resolved
- Signed commits enforced on `main`

---

## 10. Environment Variables

### Required for local dev (copy `.env.example` → `.env.local`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (preferred name) |
| `VITE_SUPABASE_ANON_KEY` | Legacy alias — still accepted |
| `VITE_OMNILINK_PORT` | Default `9876` (Single Port Rule) |

### Production (set in Cloudflare Pages dashboard)
- Do NOT add empty `[env.*]` sections to `wrangler.toml` — this blocks env var injection at build time.
- All `VITE_*` prefixed vars are exposed to the browser bundle (by design, not secrets).

### Secret-class variables (Edge Functions only, never in VITE_ prefix)
- `SUPABASE_SERVICE_ROLE_KEY`
- Provider credentials (web3, payment, BYOM)

---

## 11. Supabase Production Facts

```
Project ref:  rtopreovkywofgwgmozi
Region:       ca-central-1
```

- Every public-schema table has RLS enabled (enforced by `rls-posture-gate`).
- New tables **must** have `ENABLE ROW LEVEL SECURITY` + at least a `service_role_all` policy.
- New `SECURITY DEFINER` functions **must** pin `search_path = public` and revoke `EXECUTE` from `PUBLIC`.
- Migrations are applied via `supabase db push` (or Supabase MCP in agent sessions).
- The `app_role` enum contains only `admin` and `user` — do not reference `super_admin` or `operator`.

---

## 12. Security Baseline

- TruffleHog v3.82.7 scans every PR (commit range, `--only-verified`).
- Exclusion paths: `.trufflehog-exclude-paths.txt`.
- Gitleaks config: `.gitleaks.toml`.
- No `.env` files may be committed (enforced by CI).
- `npm audit --omit=dev --audit-level=high` must exit 0 (no high/critical production vulns).
  Current known moderate vulns (acceptable): `postcss <8.5.10`, `uuid 11.0.0–11.1.0`.

---

## 13. Document Index (Most-Referenced)

| Purpose | Document |
|---|---|
| CI gates reference | `docs/infrastructure/CI_RUNTIME_GATES.md` |
| Deployment playbook | `docs/infrastructure/PRODUCTION_DEPLOYMENT_GUIDE.md` |
| Active ops runbook | `docs/ops/OPS_RUNBOOKS_CI_GUARDRAILS.md` |
| Incident response | `docs/ops/INCIDENT_RESPONSE.md` |
| Developer onboarding | `docs/onboarding/DEVELOPER_ONBOARDING.md` |
| Branch protection | `docs/onboarding/BRANCH_PROTECTION.md` |
| Canonical truth | `docs/architecture/CANONICAL_TRUTH.md` |
| Supabase security posture | `docs/audits/SUPABASE_SECURITY_AUDIT_2026_05_04.md` |

---

*Last verified: 2026-05-06 | Build status: TSC ✅ · ESLint ✅ · 2381 tests pass ✅ · Production build ✅*
