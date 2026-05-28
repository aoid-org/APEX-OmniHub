# Prompt 12 Manifest

- **Prompt ID:** 12
- **Title:** BYOM Model Registry and Cost Controls (+ realtime gateway production safety)
- **Version:** v1.1
- **Last Updated (UTC):** 2026-05-28
- **Status:** COMPLETE (scope: PR #1216 remediation)

## Objective
Fix Prompt 12 regression while preserving fail-closed production behavior:
- move realtime endpoint safety check to runtime,
- prevent import-time throw from breaking auth/queue unit tests,
- keep production endpoint requirement strict and explicit.

## Changes Applied
1. Added runtime endpoint resolver in gateway:
   - `resolveRealtimeEndpoint()`
   - behavior:
     - uses `OPENAI_REALTIME_URL` when configured,
     - throws in production when missing,
     - falls back to default preview endpoint in non-production.
2. Added explicit gateway tests for:
   - configured realtime endpoint path,
   - disabled/unconfigured production path error,
   - invalid auth still throwing expected auth error.

## Files Touched
- `src/core/gateway/ApexRealtimeGateway.ts`
- `tests/core/gateway/ApexRealtimeGateway.spec.ts`

## Validation Evidence (Executed)
- `bun vitest run tests/core/gateway/ApexRealtimeGateway.spec.ts`
  - Result: **PASS** (`18 passed`)

## Governance Notes
- Production safety posture is preserved (fail-closed when no production realtime endpoint configured).
- No hardcoded production endpoint introduced.
