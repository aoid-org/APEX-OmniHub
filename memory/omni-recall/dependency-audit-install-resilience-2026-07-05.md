---
version: 1.0.0
last_audited: 2026-07-05
status: active
scope: security-regression dependency audit CI resilience
---

# Dependency Audit Install Resilience — 2026-07-05

## Trigger

GitHub Actions job `Dependency Security Audit` failed during the dependency install phase before `npm audit` could run. The failing command was:

```text
npm ci --ignore-scripts
```

Observed failure class:

```text
npm ERR! code ECONNRESET
npm ERR! syscall read
npm ERR! network read ECONNRESET
```

## Root cause classification

`BLOCKED-INFRA`: transient npm registry/network read reset during package download. The failure happened before dependency vulnerability evaluation, so it was not evidence of a vulnerable dependency or lockfile mismatch.

## Remediation

- Root `.npmrc` now configures conservative npm fetch retries and timeouts for all CI `npm ci`/`npm audit` calls.
- `.github/workflows/security-regression-guard.yml` now enables `actions/setup-node` npm caching for the root lockfile.
- The canonical `Dependency Security Audit` install step now retries `npm ci --ignore-scripts` up to three times with cache verification and backoff before failing closed.

## Validation

- `npm ci --ignore-scripts` completed locally with the new npm retry configuration.
- `npm audit --omit=dev --audit-level=high` completed locally with zero production high/critical vulnerabilities.

## Rollback

Revert the workflow install-step retry/cache block and remove root `.npmrc`. This restores previous fail-fast network behavior but reintroduces avoidable transient `ECONNRESET` failures.
