<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# Repo Scope Context (Senior DevOps Prep)

_Date:_ 2026-02-15  
_Repository:_ `APEX-OmniHub`

## Objective

Establish a practical, ops-focused map of the repository so the next engineering task can start with full architectural and operational context.

## High-Level Platform Context

From the root README and docs index, APEX OmniHub is organized as an enterprise AI orchestration platform with:

- A React/Vite frontend control plane (`src/`)
- Supabase edge and data plane (`supabase/functions`, `supabase/migrations`)
- A Python Temporal orchestrator (`orchestrator/`)
- Infra-as-code and runtime delivery layers (`terraform/`, `.github/workflows/`)
- Extensive validation layers (`tests/`, `sim/`, `scripts/`)

## Repository Topology (Ops-Relevant)

### Core runtime domains

- `src/` — Main UI application (OmniDash) and client-side feature domains
- `orchestrator/` — Temporal workflows, activities, policies, infra adapters (Python)
- `supabase/functions/` — serverless edge handlers (integration/orchestration entrypoints)
- `supabase/migrations/` — versioned schema + policy evolution
- `apps/` — additional app surfaces (`dashboard`, `omnihub-site`)

### Reliability/security/compliance support

- `tests/` — broad test suites (security, integration, e2e, stress, web3, etc.)
- `sim/` — chaos simulation harness and fixtures
- `security/` — security outputs/check artifacts
- `docs/` — architecture, runbooks, compliance, audits, readiness evidence

### Platform/infra automation

- `.github/workflows/` — CI/CD + security + readiness pipelines
- `scripts/` — CI, DR, security, guardian, omnilink, quality, zero-trust utilities
- `terraform/` — infra modules + environment definitions
- `android/`, `ios/` — mobile wrappers (Capacitor)

## Build/Test/Run Surface

Primary package scripts indicate a polyglot operational model:

- Frontend quality gates: `lint`, `typecheck`, `test`, `build`
- E2E + smoke checks: Playwright + asset checks
- Security/quality scans: secret scan, audit, docs checks, prompt-defense analysis
- Resilience: simulation modes (`sim:*`) and worldwide wildcard test harness
- Python orchestrator CI path: `lint:py`, `test:py`, `ci:py`
- Web3 path: Hardhat compile/test/deploy scripts

## CI/CD Workflow Inventory

Current workflow files discovered:

- `ci-runtime-gates.yml`
- `cd-staging.yml`
- `deploy-web3-functions.yml`
- `chaos-simulation-ci.yml`
- `nightly-evaluation.yml`
- `orchestrator-ci.yml`
- `production-readiness.yml`
- `secret-scanning.yml`
- `security-regression-guard.yml`

## Codebase Composition Snapshot (Tracked Files)

Based on `git ls-files` extension distribution:

- TypeScript (`.ts`): 309
- React TSX (`.tsx`): 180
- Markdown docs (`.md`): 268
- Python (`.py`): 75
- SQL migrations (`.sql`): 40
- Total tracked files: 1198

Interpretation: this is documentation-heavy with substantial TypeScript frontend/backend glue and a meaningful Python orchestration subsystem.

## Operational Readiness Notes for Next Task

1. **Multiple deploy targets exist** (frontend, edge functions, orchestrator worker, mobile wrappers); task impact should be scoped by runtime boundary first.
2. **Policy/security are first-class** (zero-trust, secret scanning, security regression workflow), so changes likely need explicit security gate consideration.
3. **Resilience tooling is mature** (`sim/`, chaos CI, wildcard tests), enabling non-happy-path validation for infra/runtime changes.
4. **Cross-language coordination is required** for end-to-end features touching TypeScript + Python + SQL contracts.

## Recommended Pre-Task Checklist (DevOps Lens)

- Confirm the target execution boundary (UI, edge, orchestrator, infra, or shared contract).
- Select the minimal verification set (TS gates, Python gates, e2e, sim) based on blast radius.
- Verify required env dependencies (`.env.example`, orchestrator env, Supabase/Temporal requirements).
- Align any infra/config deltas with matching CI workflow coverage.
- Document rollback criteria if task affects orchestrator or migrations.

## Commands Used for This Scope Pass

```bash
pwd && rg --files -g 'AGENTS.md'
find .. -name AGENTS.md -print
ls -la
rg -n "^#" README.md docs -g '*.md' | head -n 120
cat package.json
find . -maxdepth 2 -type d | sed 's|^./||' | sort
sed -n '1,260p' README.md
sed -n '1,220p' orchestrator/README.md
sed -n '1,260p' docs/README.md
find .github/workflows -maxdepth 1 -type f -name '*.yml' -o -name '*.yaml' | sed 's|^./||' | sort
python - <<'PY' ... git ls-files extension count ... PY
cat Makefile
find . -maxdepth 1 -type d | sed 's|^./||' | sort
```
