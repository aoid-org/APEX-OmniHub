<!-- APEX_DOC_STAMP: VERSION=v9.0 | LAST_UPDATED=2026-04-26 -->
# CI Runtime Gates

## Purpose
Define the runtime and architecture gates that must pass before merge/deploy.

## Current Gate Model

The authoritative workflow is `.github/workflows/ci-runtime-gates.yml`.

### Phase A — Architectural Boundary Enforcement
- Guardrail checks for monitored files
- Worker/API purity checks
- Metrics decoupling checks

### Phase B — Infrastructure Drift Gate
- Terraform expression drift tests
- Coverage thresholds for infrastructure-sensitive paths

### Phase C — Build/Test/Quality
- changelog path verification
- repo hygiene guard
- TypeScript + ESLint + React singleton check
- unit tests + coverage
- build validation + asset verification

### Phase D — Security & Operational Gates
- secret scanning
- dependency/security posture checks
- smoke/runtime rendering checks where configured

## Why this exists

Historically, static green builds still allowed runtime regressions (blank-page classes of failures, asset breakages, routing regressions). The current gate stack combines static, runtime, architectural, and infra checks to fail closed.

## Local Reproduction

```bash
npm run typecheck
npm run lint
npm run check:react
npm run test
npm run build
npm run test:assets
npm run test:e2e
npm run test:infra
```

## Notes

- This document intentionally describes gate categories, not every YAML line.
- For exact implementation details and latest updates, always inspect the workflow file directly.
- Legacy Vercel-specific bypass behavior is not canonical for current deployment topology.

