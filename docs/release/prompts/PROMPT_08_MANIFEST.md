# Prompt 08 Manifest — OmniConnect / OmniBoard connector lifecycle, vault, policy

> Reconstructed 2026-05-28 during the AG2 remediation pass. The original handoff PR left
> this manifest as a placeholder; this file documents the actual repo state. The named
> validation suites were **not re-run in this session** (dependencies are not installed in
> the ephemeral container — see Known limitations).

## Objective
Replace demo/in-memory connector behavior with durable encrypted connector lifecycle and fail-closed action policy.

## Implementation present in repo
| Path | Role |
|---|---|
| `src/omniconnect/core/**` | Connector lifecycle core |
| `src/omniconnect/storage/**` | Durable / vault-backed token + session storage |
| `src/omniconnect/policy/**` | Fail-closed action policy + schema validation |
| `src/omniconnect/delivery/**` | Delivery + DLQ recovery semantics |
| `src/omniconnect/ingress/**`, `sync/**`, `translation/**` | Ingress, sync, normalization |
| `src/omniconnect/entitlements/**` | Tenant entitlement gating |
| `tests/omniconnect/**` | Connector lifecycle, token-vault, policy, DLQ tests |

## Validation status
| Command | Result |
|---|---|
| `npm run test -- omniconnect` | NOT RUN this session (deps not installed) |
| `npm run verify:claim-hygiene` | RUN this session — FAIL (21 unproven public claims; see remediation report) |
| `npm run verify:security` | NOT RUN this session (deps not installed) |

## Known limitations
- This manifest is an after-the-fact reconstruction. Per-prompt validation must be executed in a dependency-installed environment (CI) to claim PASS.

## Next prompt readiness
Documentation continuity only — NOT a verified release gate.
