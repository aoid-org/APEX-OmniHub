# Dependabot Remediation — integration-harness ws (2026-07-14)

## Context
- Dependabot alert #178 reported `ws` memory-exhaustion DoS exposure in `integration-harness/package-lock.json` for `ws` versions `>=8.0.0 <8.21.0`.
- Affected integration harness dev dependency resolved to `ws@8.20.0` before remediation.

## Remediation
- Updated `integration-harness/package.json` dev dependency from `^8.18.0` to `^8.21.0`.
- Regenerated `integration-harness/package-lock.json` with `npm install --package-lock-only --ignore-scripts ws@^8.21.0`, resolving `node_modules/ws` to `8.21.0`.

## Validation
- `npm ci --ignore-scripts` from `integration-harness/` completed successfully.
- `npm audit --package-lock-only --audit-level=high` from `integration-harness/` completed with `found 0 vulnerabilities`.

## Risk / Rollback
- Scope is limited to the integration harness dev dependency and lockfile.
- Rollback is a normal git revert of the remediation commit if an unexpected harness compatibility issue appears.
