---
version: 1.0.0
last_audited: 2026-06-21
status: verified
---

# RFC: BYOM / Connect AI — Login Auth + Proxy Inference on a Clean Stack

Status: Review
Owner: JR (Michael Jr. Mendoza) / APEX Engineering
Date: 2026-06-21
Related Tickets: https://github.com/apexbusiness-systems/APEX-OmniHub/pull/1449
Affected Domains: BYOM (Bring-Your-Own-Model), Identity/Auth, Edge Functions, Supabase migrations

---

## 1. Problem

BYOM / Connect AI did not work end-to-end on a clean stack. The `byom-login` edge
function reused the service-role client for `signInWithPassword`, stored the encrypted
provider credential in a bytea column as JSON-array TEXT, referenced a non-existent
`audit_logs.tenant_id` column, and wrote an invalid `tool_use_permissions` enum value.
`byom-proxy` rejected the wildcard `allowed_models = '*'` written by self-service
onboarding. Separately, a clean migration apply failed at multiple history/phantom-table
points, and a trigger (`sync_admin_metadata_to_user_roles`) compared an `app_role` enum
against a `text` constant, breaking all new-user creation (including the synthetic
`<fingerprint>@byom.local` users that `byom-login` creates).

## 2. Exact User

Workspace operators who connect their own LLM provider (e.g. Groq) so inference routes
to their own provider compute through the BYOM path instead of central APEX inference.

## 3. Workflow

Connect AI onboarding → enter provider key in UI → `byom-login` validates the key with a
real provider probe, persists an encrypted credential + registry row + audit row →
`byom-proxy` streams completions from the user's provider.

## 4. Current Pain

End-to-end BYOM was broken: login failed or persisted plaintext-shaped data, proxy
rejected self-service connections, and new-user creation could fail at the trigger.

## 5. Current Workaround

None — BYOM was non-functional on a clean stack.

## 6. Proposed Change

Surgical edge + schema fixes (no architecture change):

- `byom-login`: dedicated auth client for `signInWithPassword` (service-role retained
  only for privileged DB writes); store ciphertext as PostgreSQL bytea **hex** literal;
  move tenant id into `audit_logs.metadata` (canonical schema has no `tenant_id`); use
  valid enum `tool_use_permissions: ['none']`.
- `byom-proxy`: accept wildcard `allowed_models = '*'` (self-service connections).
- `packages/schema/byom/registry.ts`: add `pii_policy = 'passthrough'`.
- Migrations: apply-time idempotency/guard fixes to already-applied migrations so a clean
  apply succeeds, plus two **forward-fix** migrations (new-user subscription status cast;
  admin role sync enum cast). Long-standing destructive-looking patterns inside scheduled
  function/cron bodies and auth-owner `ON DELETE CASCADE` foreign keys are annotated with
  the sanctioned `-- additive-allow:` reason comments rather than weakening the gate.

## 7. Business Capability

Identity, BYOM Inference Routing, Admin Operations.

## 8. Ownership Boundary

BYOM domain owns credential validation, encrypted storage, registry, and proxy routing.
Auth/Identity owns sign-in. No domain may read or log plaintext provider credentials.

## 9. Security & Reversibility (DAR)

- Directable: behind Connect AI UI + workspace BYOM enablement.
- Auditable: `byom.login` row written to `audit_logs` (key hint only, no plaintext).
- Reversible: forward-fix migrations are additive/idempotent; edge changes are
  behaviour-preserving for non-BYOM paths. No cloud migration is run as part of this PR.

## 10. Validation Status

- Backend / real-edge path: proven locally (Docker Supabase only) in the prior session.
- UI-render layer: pending Phase B real-browser validation (tracked in
  `docs/byom-validation-continuation.md`).
- No cloud Supabase / Cloudflare mutation performed.
