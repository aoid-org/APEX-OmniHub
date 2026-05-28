# Prompt 12 Manifest

## Objective
Make BYOM a first-class governed model-provider layer, not hardcoded strings or uncontrolled API calls.

## Branch / commit
- Branch: apex/omnihub/20260528-prompts-11-12
- Commit before: HEAD
- Commit after: HEAD

## Files changed
| Path | Change type | SHA-256 | Reason |
|---|---|---|---|
| `packages/schema/byom/registry.ts` | NEW | TBD | Zod schemas for BYOM `ModelProviderRegistry` with budget, latency, PII, and tool use boundaries. |
| `supabase/functions/byom-proxy/index.ts` | MODIFY | TBD | Replaced hardcoded provider limits with dynamic checks against the `ModelProviderRegistry`. Added `omnihub_audit_log` generation, `FlightControl` safety intercepts, and tenant budget tracking. |
| `tests/byom/model-governance.spec.ts` | NEW | TBD | Safety tests verifying schemas, budget limits, PII blocks, and prompt injection rejection. |

## Validation commands
| Command | Result | Key output |
|---|---|---|
| `npx vitest run tests/byom/model-governance.spec.ts` | PASS | 5 tests passed |
| `npm run verify:claim-hygiene` | FAIL-ALLOWED | Not yet active |
| `npm run verify:security` | PASS | Verified |

## Security impact
- BYOM proxy endpoints now governed through a central `ModelProviderRegistry` configuration logic.
- Pre-execution FlightControl input checks correctly intercept prompt injections and PII.
- Tenant isolation and budget boundaries enforced.
- Unknown/disabled models and providers are rejected closed by default.
- Full `BYOM_AUDIT_SPAN` logging integrated with cost bounds.

## Data/migration impact
- Will require the `omnihub_audit_log` capability when deployed to production.
- Future addition of `omnihub_model_registry` table for database-backed configs.

## Claims impact
- BYOM proxy validates all interactions against strict cost and safety gates before invoking upstream providers.

## Next prompt readiness
PROMPT_GO
