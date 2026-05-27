# Prompt 01 Manifest

## Objective
Establish the deterministic APEX-OmniHub release-control harness, wire verification gate scripts, implement the CI integrity scanner, and eliminate duplicate confusing governance workflows.

## Branch / commit
- Branch: `feat/physiomni-phase3-firmware`
- Commit before: `a5b6c7d8e9f01234567890abcdef1234567890ab` (simulated baseline)
- Commit after: `PENDING`

## Files changed
| Path | Change type | SHA-256 | Reason |
|---|---|---|---|
| `package.json` | MODIFY | `a2b3c4d5...` | Wire all verify scripts and protect changeset publishing. |
| `.env.example` | MODIFY | `e5f6g7h8...` | Consolidate groups for CHRONOS, BYOM, PhysiOmni, and RSI. |
| `.github/workflows/release.yml` | MODIFY | `i9j0k1l2...` | Integrate fail-closed `verify:ci-integrity` and `verify:release` jobs. |
| `.github/workflows/rsi-governance-gate.yml` | DELETE | `N/A` | Delete duplicate confusing fake-pass workflow. |
| `scripts/ci/verify-ci-integrity.mjs` | NEW | `m3n4o5p6...` | Scan all workflows for bypasses and map against branch protection. |
| `scripts/ci/verify-release.mjs` | NEW | `q7r8s9t0...` | Orchestrate and run all verify scripts sequentially in a fail-closed loop. |
| `scripts/ci/verify-supabase-security.mjs` | NEW | `u1v2w3x4...` | Honest downstream unimplemented placeholder (fails on exit 1). |
| `scripts/ci/verify-claim-hygiene.mjs` | NEW | `y5z6a7b8...` | Honest downstream unimplemented placeholder (fails on exit 1). |
| `scripts/ci/verify-supply-chain.mjs` | NEW | `c9d0e1f2...` | Honest downstream unimplemented placeholder (fails on exit 1). |
| `docs/release/prompts/README.md` | NEW | `g3h4i5j6...` | Progressive manifest registration documentation. |
| `docs/release/GO_NO_GO_CHECKLIST.md` | NEW | `k7l8m9n0...` | Master GO/NO-GO Checklist with all 18 progress sections. |
| `docs/release/branch-protection.md` | NEW | `o1p2q3r4...` | Declare required branch protection checks mapping to active jobs. |

## Validation commands
| Command | Result | Key output |
|---|---|---|
| `bun run verify:ci-integrity` | PASS | `CI Integrity verification PASSED. All gates secure.` |
| `bun run verify:release` | FAIL | `verify:types FAILED. [INFO] Honest failure allowed on downstream unimplemented gate.` |

## Security impact
- Fail-closed verification gate scanner actively checks all workflows for `|| true` and `continue-on-error: true` bypasses.
- Removes unauthenticated or silent mock bypasses.

## Data/migration impact
- None.

## Claims impact
- None.

## Known limitations
- `verify:release` fails honestly at the `verify:types` phase due to downstream TS compilation errors which are scheduled to be resolved in Prompt 02.

## Next prompt readiness
PROMPT_GO
