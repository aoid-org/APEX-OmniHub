<!-- APEX_DOC_STAMP: VERSION=v1.4.0 | LAST_UPDATED=2026-06-01 -->
# Developer Onboarding Guide

> **Current-state first read:** Start with `docs/CURRENT_PLATFORM_STATE_2026_06_01.md` before dated audit reports. Current audited branch/head: `work` @ `86bc14a`.

> **Agent note:** The single most important file is `CLAUDE.md` at the repo root.
> Read it first — it contains all verified commands, architecture invariants, and
> known pitfalls. This guide expands on the human-focused setup steps.

---

## Prerequisites

```bash
node --version   # Must be >= 22 (Node 22 LTS recommended; Node 24 also supported; range >=22 <25)
bun --version    # >= 1.2.14 if used for local dev (optional)
git --version    # Requires >= 2.40
```

> **Critical:** npm is the authoritative package manager for CI, releases, and the canonical lockfile (package-lock.json). Use `npm ci` for installing dependencies in CI and for clean installs. bun is optional for local development only — use `bun install` or `bun run` for speed if preferred, but never commit bun.lock changes unless you are explicitly working on lock file maintenance.

---

## Day 1: Environment Setup (~2 hours)

### Clone & Install

```bash
git clone https://github.com/apexbusiness-systems/APEX-OmniHub.git
cd APEX-OmniHub
npm ci
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
npm run typecheck    # TypeScript compilation — must produce zero errors
npm run lint         # ESLint — must produce zero warnings
npm run test         # Full test suite (~2400 tests, ~70–90 s)
npm run build        # Production Vite build → dist/
npm run dev          # Dev server → http://localhost:8080
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
| Orchestrator (Temporal Worker) | `orchestrator/` | Python 3.11+ (Temporal.io) |
| Orchestrator HTTP API + FSM | `services/orchestrator/` | Python 3.11+ (FastAPI) |
| APEX Resilience Protocol | `omega/` | Python 3.11+ (independent) |
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

### Python Services Disambiguation

These paths are similarly named but serve distinct roles — always verify the target path before editing:

| Path | Runtime | Role |
|---|---|---|
| `orchestrator/` | Python / Temporal | Worker lifecycle (`main.py`) + HTTP dispatch (`server.py`) |
| `services/orchestrator/` | Python / FastAPI | HTTP API routes (`api/routes.py`) + deterministic FSM (`fsm.py`). Must NOT initialise Temporal Workers. |
| `omega/` | Python / stdlib | APEX Resilience Protocol — human-in-the-loop verification engine (`engine.py`) + approval dashboard (`dashboard.py`). Runs independently. |
| `src/core/orchestrator/` | TypeScript | Frontend/gateway contract types only |

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


## OmniDash Sidebar Contract Onboarding Note (Added 2026-05-12)

The OmniDash left sidebar is a locked **9-widget rail**, not the broader product app registry.

- Use `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts` for all left-sidebar widget labels, ids, icon indexes, and module keys.
- Do not derive the left sidebar from `APP_REGISTRY` or `OMNIDASH_CONTRACT`; those remain 14-app product/platform contracts.
- Do not add local `NAV` or `NAV_MODULE_KEY` constants to `apps/omnihub-site/dashboard/OmniDashShell.tsx`; ESLint blocks this drift.
- Keep OmniSkills out of the left sidebar. It may remain available through header utility/module access.
- Before changing the rail, run the focused contract suite:
  ```bash
  npm run test:unit -- tests/omnidash/omnidash-sidebar-widgets.contract.spec.ts tests/omnidash/omnidash-layout-contract.spec.tsx tests/core/app-registry.spec.ts
  ```

## Day 3: First Contribution (~4 hours)

### Development Workflow

```bash
# Create your branch
git checkout -b feature/your-feature-name

# Start dev server (port 8080)
npm run dev

# Before committing — run all quality gates
npm run typecheck    # zero errors
npm run lint         # zero warnings
npm run test         # all pass
npm run build        # must succeed

# Commit (Conventional Commits format enforced by commitlint)
git add <specific-files>
git commit -m "feat(scope): concise description of what and why"
git push -u origin feature/your-feature-name
```

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

- [ ] `npm run typecheck` — zero TypeScript errors
- [ ] `npm run lint` — zero ESLint warnings
- [ ] `npm run test` — all tests pass
- [ ] `npm run build` — production build succeeds
- [ ] No secrets in code (run `npm run secret:scan`)
- [ ] Commit message follows Conventional Commits format
- [ ] `tsconfig.json` remains valid JSON (no `//` comments — breaks CI)

---

## Common Commands Reference

### Quality Gates
```bash
npm run typecheck        # TypeScript — zero errors required
npm run lint             # ESLint — zero warnings required
npm run check:react      # React singleton (must be exactly one React instance)
npm run test             # Full Vitest suite
npm run docs:check       # Doc link + file-pointer integrity
npm run build            # Production build
```

### Testing Scopes
```bash
npm run test:unit        # Unit tests (tests/lib)
npm run test:integration # Integration tests
npm run test:e2e         # Playwright E2E (install first: npm run test:e2e:install)
npm run test:assets      # Asset reachability smoke check
npm run test:infra       # Infrastructure tests
npm run test:py          # Python orchestrator tests
```

### Security
```bash
npm audit --omit=dev --audit-level=high   # Production dep audit
npm run secret:scan      # Secret scanning
```

### Operations
```bash
npm run smoke-test       # Post-deploy smoke tests
npm run guardian:status  # Guardian health check
npm run omnilink:health  # OmniLink health check
npm run dr:test          # DR dry run
```

### Simulation / Chaos
```bash
npm run sim:chaos        # Chaos engineering run
npm run sim:dry          # Dry run (no network)
npm run sim:quick        # Quick simulation
```

---

## Architecture Invariants — Never Break These

1. **npm is the authoritative package manager.** `npm ci` is the authoritative install path for CI and clean installs. `package-lock.json` is the canonical CI lockfile. bun is allowed for local dev only — never commit `bun.lock` changes unless explicitly working on lockfile maintenance.
2. **Both lockfiles must stay committed.** `bun.lock` (local bun users) + `package-lock.json` (CI canonical; required by `npm audit`).
3. **`tsconfig.json` must be pure JSON.** No `//` or `/* */` comments — `JSON.parse` in the test suite will fail.
4. **`ignoreDeprecations` must be `"5.0"`.** TypeScript 5.x rejects `"6.0"` with TS5103.
5. **One React instance.** Never introduce a secondary React dependency in sub-packages.
6. **CSP `script-src` is `'self'` only.** Do not add `'unsafe-inline'`.
7. **OmniLink port is 9876.** Do not change or expose alternative ports.
8. **All new Supabase tables must have RLS enabled.** Enforced by `rls-posture-gate`.
9. **OmniDash left sidebar is a 9-widget rail.** Use `apps/omnihub-site/src/contracts/omnidash-sidebar-widgets.ts`; never derive the rail from `APP_REGISTRY` or `OMNIDASH_CONTRACT`.

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

---

## OmniBridge Integration

OmniBridge is a bidirectional HMAC-signed sync layer connecting APEX-OmniHub (control plane)
with SBBL-HQ (first production tenant). New developers should be aware of the following:

### Validator

The integration harness lives at:
```
integration-harness/lib/deterministic-validator.mjs
```

Run it with:
```bash
node integration-harness/lib/deterministic-validator.mjs
```

This is a zero-dependency 47-assertion validator that verifies HMAC parity, envelope shape,
bidirectional HTTP simulation, risk-lane classification, latency budget, idempotency,
tamper resistance, and clock-skew rejection.

### Integration Documentation

The full Alberta Innovates TDA validation report is at:
```
docs/integration/sbbl-omnihub-validation-2026-05-11.md
```

This report documents 4 gaps closed (P0/P0/P1/P2) and 139 assertions across 3 test layers.

### Required Secrets

To run the integration against live endpoints you need the following secrets in `.env.local`:

| Secret | Description |
|---|---|
| `OMNIHUB_SIGNING_SECRET` | HMAC signing secret for outbound packets to SBBL-HQ |
| `OMNIHUB_SYNC_URL` | SBBL-HQ sync endpoint URL |
| `OMNIHUB_VERIFY_KEY` | Key used to verify inbound packets from SBBL-HQ |

### Secret Scan Note

`integration-harness/` is excluded from the secret scanner. All test HMAC fixture keys
within the validator use the `test-` prefix to avoid false positives.

---

## Platform Version History

| Version | Date | Key Change |
|---|---|---|
| v1.5.1 | 2026-05-07 | Zero tech-debt pass, Supabase security hardening |
| v1.6.0 | 2026-05-08 | Armageddon live validation (2,399 Vitest + 891 Pytest + 21 E2E) |
| v1.6.1 | 2026-05-11 | OTel CVE patch (GHSA-q7rr-3cgh-j5r3) + OmniBridge validation |
| v1.6.1 (historical) | 2026-05-20 | Shadow deployment slot provisioned (apex-omnihub-shadow.pages.dev), coverage thresholds raised, omega/ canonicalised |
| v1.7.0 | 2026-05-31 | APEX Agent rename line, OmniDash M-03/observability work, and release-line documentation |
| post-v1.7.0 docs sync | 2026-06-01 | PR #1274 OmniDash gap closure and PR #1309 security hardening reconciled into docs and Omni-Recall |

---

**Onboarding Owner:** Chief Platform Architect
**Document Version:** v1.3.0
**Last Updated:** 2026-06-01
**Next Review:** Quarterly
