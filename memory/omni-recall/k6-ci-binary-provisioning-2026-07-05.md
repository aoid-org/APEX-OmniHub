---
version: 1.0.0
last_audited: 2026-07-05
status: active
scope: ci-runtime-gates k6 smoke provisioning
---

# k6 CI Binary Provisioning — 2026-07-05

## Trigger

Post-CI action item #3 identified that `scripts/ci/perf-k6-smoke.mjs` was correctly written but the runner did not provision the `k6` binary before `npm run perf:k6:smoke`.

## Root cause classification

`BLOCKED-INFRA`: the CI workflow invoked the repo-owned k6 smoke wrapper without first installing `k6` on the GitHub-hosted runner.

## Remediation

- `.github/workflows/ci-runtime-gates.yml` now runs `grafana/setup-k6-action` before the existing soft `npm run perf:k6:smoke` step on `main`/`master`.
- The action is pinned to the `v1.2.1` commit and the k6 binary version is pinned to `1.3.0` to avoid silent latest-version drift.
- `docs/release/release-validation-matrix.json` now records performance/load as runnable in CI after provisioning, while preserving `BLOCKED` certification status until the next main/master run produces `artifacts/production-validation/performance-summary.json`.

## Validation

- Workflow YAML parsed successfully with PyYAML.
- Release validation matrix passed `npm run release:validation-matrix`.
- Local `npm run perf:k6:smoke` remains environment-blocked in this container because `k6` is not installed locally; CI now provisions it before execution.

## Rollback

Revert the `Setup k6` workflow step and the validation-matrix wording update. That restores the previous runner behavior where the perf smoke writes a `BLOCKED` summary if `k6` is absent.
