# RFC 2026-07-10: P0/P1 Audit Remediation (PR #1629)

Status: Accepted (owner review pending merge)
Scope: security + honesty remediation; architecture-impacting because it touches
`supabase/migrations/` and a shared Edge Function execution contract.

## Context
The 2026-07-10 audit found: (P0) a SECURITY DEFINER scheduler callable by
anon/authenticated via RPC; (P0) a workflow Notification action returning
`sent:true` with no delivery; (P1) backend error envelopes badged LIVE; (P1) a
Zero-Trust compliance check passing from a build flag.

## Decision
1. Add a forward-only, idempotent migration that REVOKEs EXECUTE on
   `public.dispatch_scheduled_workflows()` from PUBLIC/anon/authenticated. pg_cron
   runs as job owner and is unaffected. REVOKE statements are allowlisted for the
   additive gate (they remove an over-broad grant; not destructive to data).
2. `executeNotification` throws `NOT_IMPLEMENTED` instead of fabricating success;
   real delivery must route through `send-push-notification`.
3. `useOmniModuleState` maps `ok:false` / `State|state in {Error,Unavailable,
   NoSubscription}` to `stateKind:'unavailable'`.
4. `AuditsModule` Zero-Trust line reports `pass:false` (unverified) rather than
   deriving a pass from `import.meta.env.PROD`.

## Alternatives considered
- Wiring Notification to durable persistence now: deferred (needs recipient/token
  contract + schema); honest failure is the safe interim per Completion Proof.
- GRANT to a dedicated scheduler role instead of REVOKE-only: unnecessary because
  pg_cron executes as owner and bypasses EXECUTE checks.

## Rollback
Each change is isolated and reversible: drop the new migration / restore prior
function grants; revert the three TS edits independently.

## Architecture review
Reviewed against APEX governance (DAR: Directable, Auditable, Reversible) and the
Honest Gateway / Completion Proof rules. No new abstractions; minimal blast radius.
