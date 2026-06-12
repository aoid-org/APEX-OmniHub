---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Prompt 13 Manifest — Web3 / blockchain action safety

> Reconstructed 2026-05-28 during the AG2 remediation pass. The original handoff PR left
> this manifest as a placeholder; this file documents the actual repo state. The named
> validation suites were **not re-run in this session** (dependencies are not installed in
> the ephemeral container — see Known limitations).

## Objective
Make blockchain/Web3 execution safe, off by default, policy-bound, dry-run-first, idempotent, and audit-backed.

## Implementation present in repo
| Path | Role |
|---|---|
| `supabase/functions/web3-verify/index.ts` | Server-side signature verification |
| `supabase/functions/web3-nonce/**` | Nonce issuance (replay defense) |
| `supabase/migrations/20260101000000_create_web3_verification.sql` | Verification state + RLS |
| `src/lib/web3/**`, `src/providers/Web3Provider.tsx` | Client wallet integration (SIWE) |
| `scripts/validate-blockchain-env.sh`, `scripts/deploy-web3-functions.sh` | Env validation + deploy |
| `.github/workflows/deploy-web3-functions.yml` | Deploy workflow |
| `tests/web3/**` | Signature / nonce / policy tests |
| `docs/guides/WEB3_VERIFICATION_RUNBOOK.md` | Operational runbook |

## Validation status
| Command | Result |
|---|---|
| `npm run test -- web3` | NOT RUN this session (deps not installed) |
| `npm run verify:claim-hygiene` | RUN this session — FAIL (see remediation report) |
| `npm run verify:security` | NOT RUN this session (deps not installed) |

## Known limitations
- This manifest is an after-the-fact reconstruction. No private keys appear in repo; signer policy and dry-run gating must be re-verified in CI.

## Next prompt readiness
Documentation continuity only — NOT a verified release gate.
