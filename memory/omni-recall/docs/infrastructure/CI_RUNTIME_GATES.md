---
version: 1.1.0
last_audited: 2026-06-20
status: verified
---

<!-- APEX_DOC_STAMP: VERSION=v10.1 | LAST_UPDATED=2026-05-31 -->
# CI Runtime Gates

## Vercel Reference Classification

LEGACY — retained for historical/reference use; Cloudflare-first topology is canonical. Any Vercel commands, rollback paths, modules, or Edge Runtime references in this document are not current deployment proof unless separately labeled VERIFIED with active configuration evidence. See `docs/architecture/CANONICAL_TRUTH_MATRIX.md`.


Canonical runtime: Node 24. Minimum supported runtime: Node 22. CI and release gates use `npm ci` and `npm run ...`; Bun is optional local tooling only.


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
| `.github/workflows/ops-doc-guard.yml` | **Ops Doc Drift Guard** — fails PRs that change runtime-contract paths without updating `docs/APEX_AGENT_OPERATIONS.md` (added PR #1435, 2026-06-20) |

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
npm run test:infra
```

---

### Phase C — Build, Test, and Quality (`ci-runtime-gates.yml`)

**Job name:** `build-and-test`

Steps run in order:

| Step | Local command |
|---|---|
| Verify changelog paths exist | `node scripts/verify-changelog-paths.js CHANGELOG.md` |
| Repo hygiene guard | `bash scripts/repo-hygiene-guard.sh` |
| Lint commit messages | `npx @commitlint/cli --from <merge-base> --to HEAD` |
| TypeScript compilation | `npm run typecheck` |
| ESLint validation | `npm run lint` |
| React singleton check | `npm run check:react` |
| Unit tests | `npm run test` |
| Production build | `npm run build` |
| Asset reachability | `npm run test:assets` |

**To reproduce the full gate locally:**
```bash
node scripts/verify-changelog-paths.js CHANGELOG.md
bash scripts/repo-hygiene-guard.sh
npm run typecheck
npm run lint
npm run check:react
npm run test
npm run build
npm run test:assets
```

---

### Quality Gates (`production-readiness.yml`)

**Job name:** `quality-gates`

| Step | Local command |
|---|---|
| TypeScript compilation | `npm run typecheck` |
| ESLint validation | `npm run lint` |
| React singleton check | `npm run check:react` |
| Run tests | `npm run test` |
| Documentation drift check | `npm run docs:check` |
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

**Current npm audit status:** 0 high/critical production vulns after 2026-05-11 OTel patch
(GHSA-q7rr-3cgh-j5r3). Only moderate severity vulns present (postcss, uuid).
`npm audit --omit=dev --audit-level=high` exits 0 — no high/critical production vulns.

---

### Dependency Security Audit (`security-regression-guard.yml`)

**Job name:** `Dependency Security Audit`

| Step | Local equivalent |
|---|---|
| Install dependencies | `npm ci` |
| npm audit (prod, high+) | `npm audit --omit=dev --audit-level=high` |
| Python lockfile exists and is valid | `test -f orchestrator/requirements.lock` |

**Note:** Both `package-lock.json` and `orchestrator/requirements.lock` must be
committed for this gate to pass. Neither file should be gitignored.

---

### Code Quality Gates (`security-regression-guard.yml`)

**Job name:** `Code Quality Gates`

| Step | Local equivalent |
|---|---|
| TypeScript type check | `npm run typecheck` |
| Clear Vitest cache | `rm -rf node_modules/.vitest` |
| Run tests | `npm run test` |
| Build verification | `npm run build` |

---

### Orchestrator Gates (`orchestrator-ci.yml`)

| Gate | Local command |
|---|---|
| `rls-posture-gate` | Checks all Supabase tables have RLS enabled |
| `ruff-gate` | `npm run lint:py` |
| `legal-drift-gate` | License file integrity check |
| `claims-proof-gate` | Evidence file presence check |
| `retention-evidence-gate` | Evidence retention check |

---

## Command Mapping — Quick Reference

| Gate intent | Local command | Notes |
|---|---|---|
| TypeScript correctness | `npm run typecheck` | Must exit 0 |
| Lint policy | `npm run lint` | `--max-warnings 0` enforced |
| React singleton | `npm run check:react` | One React version only |
| Full test suite | `npm run test` | ~2400 tests |
| Production build | `npm run build` | Must exit 0 |
| Asset reachability | `npm run test:assets` | |
| E2E render | `npm run test:e2e` | Requires `npm run test:e2e:install` |
| Infra drift | `npm run test:infra` | |
| Python lint | `npm run lint:py` | |
| Python tests | `npm run test:py` | |
| npm audit (prod) | `npm audit --omit=dev --audit-level=high` | Not `bun audit` |
| Docs integrity | `npm run docs:check` | |
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
| Secret scan flags test fixture values | Test HMAC key assignments without 'test-' prefix | Prefix fixture keys with 'test-' or 'mock-' |

### Secret Scan Exclusions

`integration-harness/**` is excluded from the secret scanner via `SCAN_EXCLUDED_PREFIXES`
in `scripts/secret-scan.mjs`. This exclusion was added in v1.6.1 (2026-05-11) to prevent
false positives from the OmniBridge deterministic validator fixture keys.

**Best practice:** Even within excluded directories, all test HMAC fixture keys must use a
`test-` or `mock-` prefix. This ensures the exclusion can be narrowed in future without
introducing new false positives.

---

## Legacy Note

Historical Vercel-oriented gate context is preserved in:
`docs/archive/legacy-runbooks/CI_RUNTIME_GATES_legacy.md`
