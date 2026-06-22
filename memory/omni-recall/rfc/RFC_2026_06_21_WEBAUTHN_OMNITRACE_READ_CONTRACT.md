---
status: approved
date: 2026-06-21
pr: "#1456"
branch: claude/modest-maxwell-oqflsj
---

# RFC: WebAuthn ES256 Assertion Signature Verification + OmniTrace `audit_logs` Read Contract

## Problem

Two engineering gaps existed on the `claude/modest-maxwell-oqflsj` branch:

1. The `identity-webauthn` edge function's assert path lacked real ES256 ECDSA/P-256 signature verification — it validated the challenge and sign counter but did not cryptographically verify the authenticator signature against the stored public key.
2. The `OmniTracePanel` queried the `audit_logs` table but no idempotent, repo-backed migration guaranteed the table, required columns, RLS, SELECT policy, or read indexes.

## Exact User

APEX OmniHub platform engineer and owner deploying `identity-webauthn` edge functions and OmniTrace forensic replay to production.

## Workflow

1. Owner deploys `identity-webauthn` edge function.
2. Authenticated user initiates passkey registration: browser calls `navigator.credentials.create`, sends `attestationObject` + `clientDataJSON` to the edge function.
3. Edge function parses CBOR attestationObject, extracts ES256 P-256 public key (raw 65-byte point), stores in `device_registry.device_info.webauthn`.
4. On login, browser calls `navigator.credentials.get`, sends `authenticatorData`, `clientDataJSON`, and ECDSA signature.
5. Edge function: verifies challenge match → imports stored public key → verifies `ECDSA-P256/SHA-256` signature over `authenticatorData ‖ SHA-256(clientDataJSON)` → checks sign-counter monotonicity → rejects or admits.
6. OmniTrace reads `audit_logs` via RLS-scoped SELECT (`actor_id = auth.uid()`), groups events by correlation id when present, falls back to chronological timeline.

## Current Pain

- Assertion path was functionally incomplete: an attacker with a valid challenge could bypass signature check.
- OmniTrace panel could fail in production if `audit_logs` table or RLS policy did not exist or were misconfigured.
- No idempotent migration guaranteed the read contract on a fresh or partially-provisioned DB.

## Proposed Change

1. **WebAuthn**: implement `verifyAssertionSignature` in `webauthn-core.ts` using `crypto.subtle` (Web Crypto API, compatible with Deno edge runtime and vitest/jsdom). Verify `ECDSA/P-256/SHA-256` over `authenticatorData ‖ SHA-256(clientDataJSON)`. Parse DER or raw 64-byte r‖s signature. Reject on signature failure, consuming the challenge to prevent replay.
2. **OmniTrace migration**: author idempotent `20260621000000_omnitrace_audit_read_contract.sql` using `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ENABLE ROW LEVEL SECURITY`, guarded `DROP POLICY IF EXISTS` / `CREATE POLICY`, and `CREATE INDEX IF NOT EXISTS`.

## Business Capability

- WebAuthn: device-bound passkey login without a password. Only the authenticator holding the private key can produce a valid assertion; private key and biometrics never leave the device.
- OmniTrace: forensic decision replay over the user's own audit history, RLS-scoped, with honest fallback when no correlation id exists.

## Ownership Boundary

- `supabase/functions/identity-webauthn/` — edge function; owner deploys.
- `supabase/functions/identity-webauthn/webauthn-core.ts` — runtime-agnostic crypto; tested in vitest.
- `supabase/migrations/20260621000000_omnitrace_audit_read_contract.sql` — migration; owner applies to production DB.
- `apps/omnihub-site/src/components/OmniTracePanel.tsx` — site component; reads only.
- `apps/omnihub-site/src/lib/omniTrace.ts` — pure grouping logic; no side effects.

## Data Flow

```
Registration:
  Browser  →  identity-webauthn (challenge)  →  device_registry (store challenge)
  Browser  →  identity-webauthn (register: attestationObject + clientDataJSON)
           →  parse COSE public key  →  device_registry (store public key + signCount)
           →  audit_logs (identity.webauthn.registered)

Assertion:
  Browser  →  identity-webauthn (assert: authenticatorData + clientDataJSON + signature)
           →  load stored public key from device_registry
           →  verify ECDSA signature (Web Crypto)
           →  verify sign counter monotonicity
           →  update signCount + lastUsedAt in device_registry
           →  audit_logs (identity.webauthn.asserted OR assertion_rejected)

OmniTrace read:
  OmniTracePanel (site supabase client, JWT session)
    →  audit_logs SELECT (RLS: actor_id = auth.uid())
    →  buildDecisionChains (pure, no DB)  →  UI
```

## Contracts

- `identity-webauthn` reuses `device_registry` table (no new table). Public-key stored in `device_info.webauthn.credentials[]`. Challenge stored in `device_info.webauthn_challenge` (consumed single-use on register/assert, and on assertion failure).
- `audit_logs` columns required by OmniTrace: `id`, `actor_id`, `action_type`, `resource_type`, `resource_id`, `metadata`, `created_at`. Migration guarantees these via `ADD COLUMN IF NOT EXISTS`.
- RLS SELECT policy: `USING (actor_id = auth.uid())` — scopes reads to the authenticated user's own rows.
- Existing write paths (service-role inserts from `apex-agent`, `byom-login`, `identity-webauthn`) are unaffected — service role bypasses RLS.

## Failure Modes

| Failure | Behaviour |
|---|---|
| Invalid ECDSA signature | `assertion_failed: invalid_signature`; challenge consumed |
| Replayed challenge | Challenge expired or already consumed; `no_active_challenge` or `challenge_expired` |
| Sign-counter regression | `assertion_failed: replay_detected_stale_sign_count`; challenge consumed |
| `audit_logs` table missing | OmniTrace shows error; `identity-webauthn` receipt write silently fails (non-blocking) |
| Redis unreachable (rate limit) | `429` — fail-closed |
| No active challenge | `no_active_challenge` — user must request a new one |

## Observability

- Every assertion attempt writes to `audit_logs` with `action_type` = `identity.webauthn.asserted` (success) or `identity.webauthn.assertion_rejected` (failure + reason).
- Sign counter is stored on each successful assertion — auditable watermark.
- OmniTrace surfaces these events in the forensic replay timeline.

## Rollback Strategy

- **WebAuthn edge function**: redeploy previous version via `supabase functions deploy identity-webauthn --project-ref rtopreovkywofgwgmozi` from the prior commit. Stored credentials remain in `device_registry` and are compatible with any future re-deploy.
- **OmniTrace migration**: `20260621000000_omnitrace_audit_read_contract.sql` is additive and non-destructive. Rollback = no action required; the migration leaves no destructive footprint. RLS policy can be dropped if needed: `DROP POLICY "Users can view own audit logs" ON public.audit_logs;`.
- **UI**: OmniTrace panel is an additive route in `App.tsx`. Remove the `/omni-trace` route entry to disable without touching DB.

## Security Impact

- Closes the signature-verification gap: assertions now require possession of the authenticator's private key, not just a valid challenge.
- Challenge is single-use and time-bound (5 min). Failed assertions consume the challenge to prevent retry loops.
- No private keys, biometric templates, or attestation secrets are stored or transmitted.
- RLS on `audit_logs` ensures users can only read their own events.
- Service-role usage is confined to the edge function (server-side); browser clients use the anon/session key.

## Scalability Impact

- `crypto.subtle` is synchronous-feeling but async — minimal overhead per assertion.
- `CREATE INDEX IF NOT EXISTS` adds `idx_audit_logs_actor_id`, `idx_audit_logs_created_at`, `idx_audit_logs_resource` — all guarded, no rebuild if already present.
- OmniTrace limits query to 200 rows (`LIMIT 200`) — bounded read.

## IN SCOPE

- ES256 ECDSA/P-256 assertion signature verification in the Deno edge function.
- Idempotent `audit_logs` read-contract migration (table, columns, RLS, SELECT policy, indexes).
- Tests: 52 release tests covering challenge generation, registration, assertion crypto round-trip, tamper rejection, sign-counter monotonicity, grouping logic, and migration contract.
- Ops doc and RFC update (this file).

## OUT OF SCOPE

- Real-device FaceID/TouchID validation (owner action, post-deployment).
- Production DB migration apply (owner action).
- `memory.fullChain` — correlation id is not persisted by current writers; full-chain linking remains uncertified.
- Eyes multimodal vision certification (separate owner validation task).
- Any change to `byom-proxy` or other edge functions.

## Success Metrics

- All 52 release tests pass: `npm run test -- tests/release/`.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- `verifyAssertionSignature` returns `true` for a valid in-test P-256 key pair and `false` for tampered signatures, tampered `clientDataJSON`/`authenticatorData`, sign-counter regressions, and mismatched challenges.
- `20260621000000_omnitrace_audit_read_contract.sql` is idempotent (safe to apply twice).
- OmniTrace `CERTIFIED_FUNCTIONING` in `featureTruth.ts` with migration evidence.
- WebAuthn remains `REQUIRES_OWNER_VALIDATION` until real-device test + deployment confirmed by owner.
