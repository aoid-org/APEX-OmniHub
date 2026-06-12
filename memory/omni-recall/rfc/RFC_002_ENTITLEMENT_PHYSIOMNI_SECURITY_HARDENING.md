---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# RFC: Entitlement Activation and PhysiOmni Ingress Security Hardening

Status: Review
Owner: APEX Security Engineering
Date: 2026-06-01
Related Tickets: PR security-hardening-entitlement-physiomni
Affected Domains: Supabase Edge Functions, Supabase migrations, PhysiOmni telemetry, entitlement activation

---

## Problem

The security scan identified two production trust-boundary risks: direct entitlement escalation through the subscription activation RPC and spoofable live PhysiOmni telemetry when ingress only checked for the presence of a signature header.

## Exact User

The primary users are authenticated APEX OmniHub customers, APEX operators, PhysiOmni device integrators, and security reviewers responsible for tenant isolation and physical-action safety.

## Workflow

A browser user activates an APEX client profile through the `activate-client` Edge Function, while PhysiOmni devices submit live telemetry through `physiomni-ingress` for alerting and downstream safety workflows.

## Current Pain

Security reviewers could not prove that ordinary authenticated clients were blocked from calling the entitlement RPC directly, and live PhysiOmni ingress did not cryptographically bind telemetry to a trusted device or integration secret.

## Current Workaround

Operators relied on deployment discipline, UI gating, and manual scan review instead of a database-enforced service-role boundary and fail-closed live telemetry HMAC verification.

## Proposed Change

Restrict `activate_client_subscription` execution to the trusted service-role path, route activation through a server-side admin client that binds activation to the authenticated user, and require HMAC-SHA256 plus timestamp freshness before accepting live PhysiOmni telemetry.

## Business Capability

This supports Identity, Admin Operations, Physical Telemetry Safety, Auditability, and Zero-Trust Partner Integration.

## Ownership Boundary

Security Engineering owns the entitlement and telemetry trust-boundary controls. Supabase Edge Functions may call the entitlement RPC only through the service-role client. Browser clients, ordinary authenticated users, partner payloads, LLM outputs, and device telemetry may not bypass these server-side controls.

## Data Flow

Activation input flows from the browser JWT to `activate-client`, then to Supabase Auth verification, then to the service-role RPC call with `p_user_id` fixed to the authenticated user. PhysiOmni telemetry flows from raw request body plus `x-physiomni-timestamp` and `x-physiomni-signature` into HMAC verification before schema validation, persistence, alert updates, and audit records.

## Contracts

`activate_client_subscription(UUID, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)` must fail closed unless `auth.role()` is `service_role`. `activate-client` must require a valid bearer JWT and configured service-role key. Live PhysiOmni ingress must require `PHYSIOMNI_INGRESS_HMAC_SECRET`, a fresh timestamp, and a signature matching HMAC-SHA256 over `timestamp.rawBody`.

## Failure Modes

Missing service-role configuration returns a sanitized server error and does not activate entitlements. Invalid JWTs return unauthorized responses. Missing PhysiOmni HMAC configuration, stale timestamps, malformed signatures, and mismatched signatures return authorization errors before telemetry mutation. Operators are alerted through existing Edge Function logs and audit trails.

## Observability

The change preserves existing Supabase Edge Function logs, entitlement records, PhysiOmni alert updates, and audit logging. Failed authorization paths are intentionally sanitized for callers while remaining diagnosable through server-side logs.

## Rollback Strategy

Rollback by reverting the Edge Function updates and the hardening migration in a controlled deployment. If emergency service restoration is required, deploy the prior Edge Function versions first, then apply a database rollback reviewed by Security Engineering because relaxing RPC grants affects authorization posture.

## Security Impact

The change reduces entitlement escalation risk, cross-tenant mutation risk, forged telemetry risk, replay exposure from stale timestamps, and physical-action safety risk. Secrets remain server-side and HMAC comparison uses constant-time logic.

## Scalability Impact

HMAC verification is linear in request size and bounded by the existing request handling path. Timestamp checks avoid persistent replay state requirements for this patch and do not add external services or runtime dependencies.

## AI Impact

AI agents do not receive new authority. Prompt-injected or model-generated requests remain untrusted and must pass the same JWT, service-role, and HMAC controls before state mutation.

## IN SCOPE

- Service-role-only entitlement RPC execution.
- Server-side activation binding to the authenticated user.
- Live PhysiOmni HMAC and timestamp enforcement.
- Regression tests for the above security boundaries.
- Governance evidence for the architecture-impacting PR.

## OUT OF SCOPE

- New entitlement tiers or billing behavior.
- New PhysiOmni device registry features.
- Production secret rotation or deployment execution.
- Changes to MAN Mode approval policy.

## Success Metrics

- Direct authenticated calls to `activate_client_subscription` are denied.
- `activate-client` can only activate the authenticated user through the service role.
- Live PhysiOmni telemetry without a valid fresh HMAC is rejected.
- The RFC architecture marker gate can identify committed RFC evidence for this PR.

## Architecture Review Checklist

- [x] No god object introduced
- [x] Domain boundary preserved
- [x] Cross-domain database writes avoided
- [x] Contracts documented
- [x] Rollback path defined
- [x] Observability defined
- [x] Failure modes defined
- [x] Security impact reviewed
- [x] Performance impact reviewed
- [x] Scope boundaries explicit
- [x] User workflow improvement clear

## Approval

Product Owner: Pending / 2026-06-01
Architecture Reviewer: Pending / 2026-06-01
Security Reviewer: Pending / 2026-06-01
Operations Reviewer: Pending / 2026-06-01
