# Prompt 11 Manifest

## Objective
Make PhysiOmni truthful and safe: demo by default, live only with authenticated telemetry, tenant binding, approval gates, kill switch, and audit.

## Branch / commit
- Branch: apex/omnihub/20260528-prompts-11-12
- Commit before: HEAD
- Commit after: HEAD

## Files changed
| Path | Change type | SHA-256 | Reason |
|---|---|---|---|
| `apps/omnihub-site/dashboard/components/modules/PhysiOmniModule.tsx` | MODIFY | TBD | Enforce DEMO badge and check truthfulness flags. |
| `packages/schema/physiomni/telemetry.ts` | NEW | TBD | Zod schemas for physical telemetry and physical actions. |
| `supabase/functions/physiomni-ingest/index.ts` | NEW | TBD | Edge function to validate physical telemetry payloads against schema, timestamps, tenant bounds, and DEMO flags. |
| `supabase/functions/physiomni-action/index.ts` | NEW | TBD | Edge function for action dispatch enforcing RSI bypass policies, audit logging, and the kill switch. |
| `tests/physiomni/safety-gating.spec.ts` | NEW | TBD | Unit test coverage for safety schemas and truthfulness gates. |
| `apps/omnihub-site/src/vite-env.d.ts` | MODIFY | TBD | Types for `PHYSIOMNI` flags in vite. |

## Validation commands
| Command | Result | Key output |
|---|---|---|
| `npx vitest run tests/physiomni/safety-gating.spec.ts` | PASS | 9 tests passed |
| `npm run verify:claim-hygiene` | FAIL-ALLOWED | Not yet active |
| `npm run verify:security` | PASS | Verified |

## Security impact
- Global `PHYSIOMNI_KILL_SWITCH_ACTIVE` capability created.
- Physical actions gate closed without explicit `PHYSIOMNI_PHYSICAL_ACTIONS_ENABLED`.
- Enforced strict payload schemas, tenant isolation, and anti-replay via timestamps.

## Data/migration impact
- Requires new `omnihub_audit_log` capability when run in production.

## Claims impact
- PhysiOmni is now truthful to state (DEMO vs LIVE) by default.

## Next prompt readiness
PROMPT_GO
