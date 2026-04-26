<!-- APEX_DOC_STAMP: VERSION=v9.1 | LAST_UPDATED=2026-04-26 -->
# CI Runtime Gates

## Purpose
Define runtime, architecture, and security gates required before merge/deploy, with onboarding-friendly command mapping.

## Authoritative Source
- Workflow YAML: `.github/workflows/ci-runtime-gates.yml`

This document is an operator guide; YAML is the exact implementation source.

---

## Gate Phases

### Phase A — Architectural Boundary Enforcement
- monitored file existence
- worker/API purity checks
- metrics decoupling checks

### Phase B — Infrastructure Drift
- terraform expression drift tests
- infra-sensitive coverage thresholds

### Phase C — Build, Test, and Quality
- changelog path verification
- repo hygiene guard
- TypeScript, ESLint, React singleton validation
- unit tests + coverage
- production build + asset checks

### Phase D — Security and Operational Readiness
- secret scanning
- dependency/security posture checks
- runtime smoke/e2e checks where configured

---

## Command Mapping (Local)

| Gate intent | Local command |
|---|---|
| TS correctness | `npm run typecheck` |
| Lint policy | `npm run lint` |
| React singleton | `npm run check:react` |
| Unit/runtime tests | `npm run test` |
| Build correctness | `npm run build` |
| Asset reachability | `npm run test:assets` |
| E2E render confidence | `npm run test:e2e` |
| Infra drift checks | `npm run test:infra` |

---

## Failure Triage Quick Playbook

1. Identify failing phase in CI summary.
2. Reproduce locally with mapped command.
3. If architectural guardrail fails, fix boundary violation before any feature work.
4. If infra drift fails, reconcile Terraform/tests together.
5. If runtime checks fail, treat as release blocker.

---

## Legacy Note

Historical Vercel-oriented gate context is preserved in:
`docs/archive/legacy-runbooks/CI_RUNTIME_GATES_legacy.md`.

