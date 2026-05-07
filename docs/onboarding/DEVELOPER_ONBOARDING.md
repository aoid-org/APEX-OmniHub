<!-- APEX_DOC_STAMP: VERSION=v2.1.0 | LAST_UPDATED=2026-05-07 -->
# Developer Onboarding Guide

> **Agent note:** The single most important file is `CLAUDE.md` at the repo root.
> Read it first — it contains all verified commands, architecture invariants, and
> known pitfalls. This guide expands on the human-focused setup steps.

---

## Prerequisites

```bash
node --version   # Must be >= 20.19.0 (Node 22 LTS also accepted)
bun --version    # Must be >= 1.2.14
git --version    # Requires >= 2.40
```

> **Critical:** This project uses **bun** as its package manager, not npm or yarn.
> All install commands use `bun install`. npm is only used for `npm audit` in CI.

---

## Day 1: Environment Setup (~2 hours)

### Clone & Install

```bash
git clone https://github.com/apexbusiness-systems/APEX-OmniHub.git
cd APEX-OmniHub
bun install
cp .env.example .env.local
```

### Configure Environment

Edit `.env.local` with credentials from the team vault:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key |
| `VITE_SUPABASE_ANON_KEY` | Legacy alias — still accepted if preferred |
| `VITE_OMNILINK_PORT` | Default `9876` (Single Port Rule — do not change) |

> **Deployment note:** Production env vars are set in Cloudflare Pages dashboard
> (Settings → Environment Variables). Do NOT add empty `[env.*]` sections to
> `wrangler.toml` — this blocks env var injection at build time.

### Verify Installation

```bash
bun run typecheck    # TypeScript compilation — must produce zero errors
bun run lint         # ESLint — must produce zero warnings
bun run test         # Full test suite (~2400 tests, ~70–90 s)
bun run check:drift  # Canonical drift guard: runtime, headers, shims, replay ordering, docs claims
bun run build        # Production Vite build → dist/
bun run dev          # Dev server → http://localhost:8080
```

> **Port:** The dev server runs on **port 8080**, not 5173. This is set in `vite.config.ts`.

---

## Day 2: Architecture Deep Dive (~4 hours)

### Platform Overview

APEX OmniHub is a Universal Sync Orchestrator built on a "Holy Trinity":

1. **OmniHub** — Logic & Policy (TypeScript + Python orchestrator)
2. **OmniLink** — Secure Gateway (Single Port: 9876)
3. **OmniPort** — Multimodal Normalizer (I/O standardization)

### Runtime Topology

| Layer | Location | Language |
|---|---|---|
| Frontend (OmniDash) | `apps/omnihub-site/src/` | TypeScript / React 18 |
| Frontend shim | `src/App.tsx` | Re-exports `apps/omnihub-site/src/App.tsx` |
| Edge functions | `supabase/functions/` | TypeScript (Deno) |
| Orchestrator | `orchestrator/` | Python 3.11+ (Temporal.io) |
| Infra-as-code | `terraform/` | HCL |

### Critical Architecture Files

```
apps/omnihub-site/src/
├── App.tsx                         # Main app entry point
├── contexts/OmniLinkContext.tsx    # OmniLink React context
├── integrations/omnilink/client.ts # OmniLink client
└── pages/                          # Route pages (33 files)

src/
├── security/
│   ├── securityAuditLogger.ts      # Audit logging (referenced by security posture check)
│   └── promptDefense.ts            # Prompt injection defense
└── App.tsx                         # Shim → apps/omnihub-site/src/App.tsx

orchestrator/
├── main.py                         # Temporal worker entry point
├── server.py                       # FastAPI metrics/health server
├── core/                           # Business logic activities
├── workflows/                      # Temporal workflow definitions
└── security/                       # Guardian / policy enforcement
```

### Path Alias Split — CRITICAL, DO NOT CHANGE

The `@/*` alias resolves differently in app vs test context. **This is intentional.**

| Config file | `@/*` resolves to |
|---|---|
| `vite.config.ts` | `./apps/omnihub-site/src/*` |
| `tsconfig.json` | `./apps/omnihub-site/src/*` |
| `vitest.config.ts` | `./src/*` (root package) |

Tests under `tests/` import root-package modules via `@/`.
The app imports omnihub-site modules via `@/`.
**Do not "align" these — the split is load-bearing for test isolation.**

### Key Documentation

| Topic | Document |
|---|---|
| Agent briefing (read first) | `CLAUDE.md` |
| CI gates reference | `docs/infrastructure/CI_RUNTIME_GATES.md` |
| Architecture canonical map | `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md` |
| Canonical truth (conflict resolver) | `docs/architecture/CANONICAL_TRUTH.md` |
| Orchestrator details | `orchestrator/ARCHITECTURE.md` |
| Tri-Force Protocol | `docs/capabilities/tri-force-protocol.md` |
| OmniPort protocol | `docs/capabilities/omniport.md` |

---

## Day 3: First Contribution (~4 hours)

### Development Workflow

```bash
# Create your branch
git checkout -b feature/your-feature-name

# Start dev server (port 8080)
bun run dev

# Before committing — run all quality gates
bun run typecheck    # zero errors
bun run lint         # zero warnings
bun run test         # all pass
bun run build        # must succeed

# Commit (Conventional Commits format enforced by commitlint)
git add <specific-files>
git commit -m "feat(scope): concise description of what and why"
git push -u origin feature/your-feature-name
```


### Anti-Regression / Drift Guardrail Rules

`bun run check:drift` must pass before every PR update. It is intentionally broader than a style check and blocks changes that historically caused regressions:

| Guarded area | Required invariant | Why it exists |
|---|---|---|
| React runtime | React and React DOM declarations remain on 18.3.1-compatible ranges | Prevents hook/runtime split-brain between root and app-site |
| Lockfiles | Root `bun.lock` + root `package-lock.json` are authoritative; no app-site nested lockfiles | Prevents dependency authority drift |
| OmniDash | Legacy `src/components/omnidash` files stay compatibility re-export shims to `dashboard/components` | Prevents duplicate implementation trees |
| Headers | COOP stays `same-origin`; CSP `script-src` stays `'self'` | Prevents deployment security regression |
| OmniBridge | Signature verification precedes replay-store mutation | Prevents invalid packets from poisoning replay state |
| Repo hygiene | Generated logs/output/Python cache files are not tracked | Prevents noisy and misleading artifacts |
| Docs claims | Active docs use evidence-led status language, not stale certification claims | Prevents hallucinated readiness narratives |

Do not bypass this gate. If a legitimate architecture change requires changing an invariant, update `docs/architecture/CANONICAL_TRUTH.md`, this guide, the guard script, and the tests in the same PR.

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <description>

Types: feat | fix | chore | refactor | ci | docs | test | perf | build
```

Examples:
```
feat(omnidash): add realtime subscription to dashboard widgets
fix(auth): handle expired Supabase session gracefully
chore(deps): bump protobufjs 7.5.4 → 7.5.5 (CVE-2026-41242)
```

### Pre-Commit Checklist

- [ ] `bun run typecheck` — zero TypeScript errors
- [ ] `bun run lint` — zero ESLint warnings
- [ ] `bun run test` — all tests pass
- [ ] `bun run check:drift` — canonical runtime, security headers, source-tree shims, replay ordering, repo hygiene, and evidence-language invariants pass
- [ ] `bun run build` — production build succeeds
- [ ] No secrets in code (run `bun run secret:scan`)
- [ ] Commit message follows Conventional Commits format
- [ ] `tsconfig.json` remains valid JSON (no `//` comments — breaks CI)

---

## Common Commands Reference

### Quality Gates
```bash
bun run typecheck        # TypeScript — zero errors required
bun run lint             # ESLint — zero warnings required
bun run check:react      # React singleton (must be exactly one React instance)
bun run test             # Full Vitest suite
bun run docs:check       # Doc link + file-pointer integrity
bun run build            # Production build
```

### Testing Scopes
```bash
bun run test:unit        # Unit tests (tests/lib)
bun run test:integration # Integration tests
bun run test:e2e         # Playwright E2E (install first: bun run test:e2e:install)
bun run test:assets      # Asset reachability smoke check
bun run test:infra       # Infrastructure tests
bun run test:py          # Python orchestrator tests
```

### Security
```bash
npm audit --omit=dev --audit-level=high   # Production dep audit
bun run secret:scan      # Secret scanning
```

### Operations
```bash
bun run smoke-test       # Post-deploy smoke tests
bun run guardian:status  # Guardian health check
bun run omnilink:health  # OmniLink health check
bun run dr:test          # DR dry run
```

### Simulation / Chaos
```bash
bun run sim:chaos        # Chaos engineering run
bun run sim:dry          # Dry run (no network)
bun run sim:quick        # Quick simulation
```

---

## Architecture Invariants — Never Break These

1. **Package manager is bun.** Never commit changes that use `npm install` / `yarn install`.
2. **Both lockfiles must stay committed.** `bun.lock` (installs) + `package-lock.json` (`npm audit` in CI).
3. **`tsconfig.json` must be pure JSON.** No `//` or `/* */` comments — `JSON.parse` in the test suite will fail.
4. **`ignoreDeprecations` must be `"5.0"`.** TypeScript 5.x rejects `"6.0"` with TS5103.
5. **One React instance.** Never introduce a secondary React dependency in sub-packages.
6. **CSP `script-src` is `'self'` only.** Do not add `'unsafe-inline'`.
7. **OmniLink port is 9876.** Do not change or expose alternative ports.
8. **All new Supabase tables must have RLS enabled.** Enforced by `rls-posture-gate`.

---

## Getting Help

- **Documentation index:** `docs/README.md`
- **Architecture map:** `docs/architecture/ARCHITECTURE_CANONICAL_MAP.md`
- **Canonical truth:** `docs/architecture/CANONICAL_TRUTH.md`
- **CI failures:** `docs/infrastructure/CI_RUNTIME_GATES.md`
- **Agent briefing:** `CLAUDE.md` (root of repo)

---

## Critical Security Rules

1. Never commit `.env` files — CI will catch and block the PR.
2. Use TypeScript strict mode — `noImplicitAny`, `strictNullChecks` are enabled.
3. Log all authentication events via `src/security/securityAuditLogger.ts`.
4. Validate user inputs at system boundaries; trust internal framework contracts.
5. Follow OWASP Top 10 guidelines for any new API surface.

---

**Onboarding Owner:** Chief Platform Architect
**Document Version:** 2.0.0
**Last Updated:** 2026-05-06
**Next Review:** Quarterly
