# Prompt 07 Manifest — OmniBridge signed ingress, replay defense, dispatch states, DLQ

> Reconstructed 2026-05-28 during the AG2 remediation pass. The original handoff PR left
> this manifest as a placeholder; this file documents the actual repo state. The named
> validation suites were **not re-run in this session** (dependencies are not installed in
> the ephemeral container — see Known limitations).

## Objective
Harden OmniBridge enterprise ingress so signed events are verifiable, replay-safe, source/tenant-bound, dispatch-tracked, and DLQ-correct.

## Implementation present in repo
| Path | Role |
|---|---|
| `src/lib/omnibridge/verifySignedIngress.ts` | Raw-body HMAC verification entrypoint |
| `src/lib/omnibridge/syncPacketVerifier.ts` | Signature + timestamp-skew validation |
| `src/lib/omnibridge/replayStore.ts` | Durable replay-nonce store (TTL) |
| `src/lib/omnibridge/sourceRegistry.ts`, `registryEnv.ts` | Key registry: rotation/revocation, tenant/source binding |
| `src/lib/omnibridge/eventEnvelope.ts`, `eventStore.ts` | Delivery-state envelope + persistence |
| `src/lib/omnibridge/outboundCaller.ts` | Dispatch / retry path |
| `api/omnibridge/token.ts` | Token issuance route |
| `tests/api/omnibridge-{ingest,sync,token,roundtrip}.test.ts`, `tests/lib/omnibridge/**` | Signature/replay/DLQ tests |

## Validation status
| Command | Result |
|---|---|
| `npm run test -- omnibridge` | NOT RUN this session (deps not installed) |
| `npm run verify:security` | NOT RUN this session (deps not installed) |

## Known limitations
- This manifest is an after-the-fact reconstruction. Per-prompt validation must be executed in a dependency-installed environment (CI) to claim PASS. Do not treat as verified GO evidence.

## Next prompt readiness
Documentation continuity only — NOT a verified release gate.
