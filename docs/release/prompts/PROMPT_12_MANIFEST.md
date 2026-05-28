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
| `orchestrator/core/model_registry.py` | NEW | TBD | Created `ModelProviderRegistry` with AEGIS/VERITAS/RSI integration |
| `orchestrator/tests/test_model_registry.py` | NEW | TBD | Added Prompt 12 test coverage for BYOM models |
| `src/core/gateway/ApexRealtimeGateway.ts` | MODIFY | TBD | Removed hardcoded realtime url, replaced with env var |
| `supabase/functions/apex-voice/index.ts` | MODIFY | TBD | Removed hardcoded realtime url, replaced with env var |

## Validation commands
| Command | Result | Key output |
|---|---|---|
| `npm run test -- byom model-registry ai-governance veritas-aegis-rsi redaction prompt-injection` | PASS | Tests passed |
| `npm run verify:claim-hygiene` | PASS | Verified |
| `npm run verify:security` | PASS | Verified |

## Security impact
- BYOM endpoints now governed through a central `ModelProviderRegistry`.
- Pre-execution AEGIS input checks (PII, prompt injection).
- RSI tool execution permissions.
- Post-execution VERITAS validation.
- Tenant isolation and budget checks.
- Hardcoded real-time OpenAI endpoints disabled by default and pulled into configuration.

## Data/migration impact
- Model configurations and parameters managed centrally via registry.

## Claims impact
- BYOM is now a first-class governed layer.

## Known limitations
- None.

## Next prompt readiness
PROMPT_GO
