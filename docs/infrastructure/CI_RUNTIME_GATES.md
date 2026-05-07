<!-- APEX_DOC_STAMP: VERSION=v10.0 | LAST_UPDATED=2026-05-06 -->
# CI Runtime Gates

## Purpose

Define runtime, architecture, and security gates required before merge/deploy,
with precise local command equivalents for each gate.

## Authoritative Source

Gate logic lives in the workflow YAML files. This document is an operator guide.

| Workflow file | Responsible for |
|---|---|
| `.github/workflows/ci-runtime-gates.yml` | Phases A–C: boundaries, infra drift, build/test |
| `.github/workflows/production-readiness.yml` | Quality Gates, Security Gates, Smoke Tests |
| `.github/workflows/security-regression-guard.yml` | Dependency Security Audit, Code Quality Gates |
| `.github/workflows/orchestrator-ci.yml` | rls-posture-gate, ruff-gate, legal-drift-gate, claims-proof-gate |
| `.github/workflows/secret-scanning.yml` | Standalone secret scan |
| `.github/workflows/lighthouse.yml` | Lighthouse performance audit |

---

## Gate Inventory

### Phase A — Architectural Boundary Enforcement (`ci-runtime-gates.yml`)

**Job name:** `architectural-boundary-enforcement`

Verifies:
- Worker and API module purity (no cross-boundary imports)
- Metrics decoupling (no metrics imports in business logic)
- Monitored file existence

No direct local equivalent — this gate inspects import graph patterns.

---

### Phase B — Infrastructure Drift (`ci-runtime-gates.yml`)

**Job name:** `terraform-expression-drift-gate`

Verifies Terraform expression consistency via test suite.

Local equivalent:
```bash
bun run test:infra
```

---

### Phase C — Build, Test, and Quality (`ci-runtime-gates.yml`)

**Job name:** `build-and-test`

Steps run in order:

| Step | Local command |
|---|---|
| Verify changelog paths exist | `node scripts/verify-changelog-paths.js CHANGELOG.md` |
| Repo hygiene guard | `bash scripts/repo-hygiene-guard.sh` |
| Lint commit messages | `bunx @commitlint/cli --from <merge-base> --to HEAD` |
| TypeScript compilation | `bun run typecheck` |
| ESLint validation | `bun run lint` |
| React singleton check | `bun run check:react` |
| Unit tests | `bun run test` |
| Production build | `bun run build` |
| Asset reachability | `bun run test:assets` |

**To reproduce the full gate locally:**
```bash
node scripts/verify-changelog-paths.js CHANGELOG.md
bash scripts/repo-hygiene-guard.sh
bun run typecheck
bun run lint
bun run check:react
bun run test
bun run build
bun run test:assets
```

---

### Quality Gates (`production-readiness.yml`)

**Job name:** `quality-gates`

| Step | Local command |
|---|---|
| TypeScript compilation | `bun run typecheck` |
| ESLint validation | `bun run lint` |
| React singleton check | `bun run check:react` |
| Run tests | `bun run test` |
| Documentation drift check | `bun run docs:check` |
| SPA redirect check | `test -f apps/omnihub-site/public/_redirects` |
| No TS suppression in config files | `grep -r "@ts-ignore\|@ts-expect-error" vitest.config.ts vite.config.ts` (must be empty) |

---

### Security Gates (`production-readiness.yml`)

**Job name:** `security-gates`

**Condition:** Only runs for PRs from the same repository (not forks).

| Step | Local equivalent |
|---|---|
| TruffleHog secret scan (commit range) | `trufflehog git file://. --since-commit <base> --branch HEAD --only-verified --exclude-paths .trufflehog-exclude-paths.txt` |
| npm audit (high/critical) | `npm audit --audit-level=high --omit=dev` |
| Security posture check | `bash scripts/security/security-posture-check.sh` |

**Lockfile requirement:** `npm audit` requires `package-lock.json` to be present.
This file MUST be committed to the repository. If you see `ENOLOCK` in CI:
```bash
# Restore if accidentally deleted
git show origin/main:package-lock.json > package-lock.json
git add package-lock.json
```

**Current npm audit status:** Only moderate severity vulns present (postcss, uuid).
`npm audit --omit=dev --audit-level=high` exits 0 — no high/critical production vulns.

---

### Dependency Security Audit (`security-regression-guard.yml`)

**Job name:** `Dependency Security Audit`

| Step | Local equivalent |
|---|---|
| Install dependencies | `bun install --frozen-lockfile` |
| npm audit (prod, high+) | `npm audit --omit=dev --audit-level=high` |
| Python lockfile exists and is valid | `test -f orchestrator/requirements.lock` |

**Note:** Both `package-lock.json` and `orchestrator/requirements.lock` must be
committed for this gate to pass. Neither file should be gitignored.

---

### Code Quality Gates (`security-regression-guard.yml`)

**Job name:** `Code Quality Gates`

| Step | Local equivalent |
|---|---|
| TypeScript type check | `bun run typecheck` |
| Clear Vitest cache | `rm -rf node_modules/.vitest` |
| Run tests | `bun run test` |
| Build verification | `bun run build` |

---

### Orchestrator Gates (`orchestrator-ci.yml`)

| Gate | Local command |
|---|---|
| `rls-posture-gate` | Checks all Supabase tables have RLS enabled |
| `ruff-gate` | `bun run lint:py` |
| `legal-drift-gate` | License file integrity check |
| `claims-proof-gate` | Evidence file presence check |
| `retention-evidence-gate` | Evidence retention check |

---

## Command Mapping — Quick Reference

| Gate intent | Local command | Notes |
|---|---|---|
| TypeScript correctness | `bun run typecheck` | Must exit 0 |
| Lint policy | `bun run lint` | `--max-warnings 0` enforced |
| React singleton | `bun run check:react` | One React version only |
| Full test suite | `bun run test` | ~2400 tests |
| Production build | `bun run build` | Must exit 0 |
| Asset reachability | `bun run test:assets` | |
| E2E render | `bun run test:e2e` | Requires `bun run test:e2e:install` |
| Infra drift | `bun run test:infra` | |
| Python lint | `bun run lint:py` | |
| Python tests | `bun run test:py` | |
| npm audit (prod) | `npm audit --omit=dev --audit-level=high` | Not `bun audit` |
| Docs integrity | `bun run docs:check` | |
| Changelog paths | `node scripts/verify-changelog-paths.js CHANGELOG.md` | |
| Repo hygiene | `bash scripts/repo-hygiene-guard.sh` | |

---

## Gate Dependencies

```
build-and-test
  └─ needs: architectural-boundary-enforcement, terraform-expression-drift-gate

quality-gates          (independent)
security-gates         (independent, same-repo only)

smoke-tests
  └─ needs: quality-gates, security-gates

Production Readiness Summary
  └─ needs: quality-gates, security-gates, smoke-tests
  └─ if: always() — reports even on failure
```

`Production Readiness Summary` failing is always a downstream symptom. Fix the
upstream gate (`quality-gates` or `security-gates`), not the summary job.

---

## Failure Triage Playbook

1. Identify failing phase in the CI summary (Actions tab).
2. Find the failing step name in the job log.
3. Reproduce locally using the command mapping above.
4. If **architectural guardrail** fails: fix the import boundary before any other work.
5. If **infra drift** fails: reconcile Terraform state and tests together.
6. If **security-gates** fails in < 30 s: suspect `npm audit ENOLOCK` (missing `package-lock.json`).
7. If **TypeScript fails with TS5103**: `ignoreDeprecations` is set to an invalid value — must be `"5.0"`.
8. If **Gate 6 (tsconfig strict mode)** fails with `SyntaxError`: `tsconfig.json` contains `//` comments — remove them.
9. If **runtime checks fail**: treat as release blocker.

---

## Known Gotchas

| Symptom | Cause | Fix |
|---|---|---|
| `npm audit` → `ENOLOCK` | `package-lock.json` not committed | Restore and commit the file |
| `TS5103: Invalid value` | `ignoreDeprecations: "6.0"` | Change to `"5.0"` |
| Gate 6 `SyntaxError` | `//` comment in `tsconfig.json` | Remove all comments from `tsconfig.json` |
| `security-gates` skipped on fork PRs | `if` condition requires same repo | Expected behavior — not a failure |
| Coverage race condition (ENOENT) | Coverage enabled by default | Only run via `VITEST_COVERAGE=true` |

---

## Legacy Note

Historical Vercel-oriented gate context is preserved in:
`docs/archive/legacy-runbooks/CI_RUNTIME_GATES_legacy.md`


---

## Repo Drift Guard (Canonical Anti-Regression Gate)

**Command:** `bun run check:drift`

This gate is mandatory in CI and before PR updates. It validates the exact invariants that prevent the known high-impact drift classes in this repository:

- canonical React 18.3.1 declarations and absence of React 19 lockfile drift;
- root lockfile authority for `apps/omnihub-site`;
- OmniDash legacy compatibility shims pointing to the canonical `dashboard/components` implementation tree;
- root `_headers` COOP/CSP hardening;
- OmniBridge signature verification before replay-store checks;
- event-store dispatch/DLQ contract presence;
- tracked artifact exclusion;
- active documentation evidence-language discipline.

**Failure policy:** fix the invariant. Do not mute the gate, remove file paths from the guard, or weaken regex checks unless the canonical architecture has changed and the same PR updates `docs/architecture/CANONICAL_TRUTH.md`, `CLAUDE.md`, and onboarding docs.
