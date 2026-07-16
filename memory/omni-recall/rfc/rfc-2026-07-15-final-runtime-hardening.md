# RFC 2026-07-15: Final Runtime Security and Integrity Hardening

Status: Review
Owner: APEX Business Systems LTD
Date: 2026-07-15
Related Tickets: PR #1636; PR #1629
Affected Domains: Supabase Edge, Postgres RLS, Orchestrator, release governance

## 1. Problem

The release audit found privileged gateway authentication that could fail open,
an OmniSkills resolver using a non-canonical table, audit persistence that did
not match the live table contract, a health check that always succeeded, and a
proxy path capable of bypassing webhook DNS pinning.

## 2. Exact User

Authenticated APEX-OmniHub customers, operators, and compliance reviewers who
depend on tenant isolation, reliable audit evidence, and accurate health state.

## 3. Workflow

Authenticate a privileged MCP request, resolve user-scoped module state,
persist/query audit evidence, execute Temporal work, and deliver DNS-pinned
webhooks without weakening authorization boundaries.

## 4. Current Pain

Misconfiguration or persistence failure could be represented as success, and
the worker health signal did not prove its required Temporal dependency.

## 5. Current Workaround

Operators relied on manual probes and log inspection. That is insufficient for
a deterministic enterprise release gate.

## 6. Proposed Change

Use mandatory header-only MCP authentication and shared allowlisted CORS; read
canonical RLS-backed OmniSkills tables; map audit events to the live schema and
fail closed; check Temporal health; disable environment proxies for the pinned
webhook client; convert caller-bound RPCs to invoker mode with explicit RLS;
and move privileged authorization implementations behind public invoker wrappers
into a non-exposed schema.

## 7. Business Capability

Identity, auditability, workflow operations, integrations, and administration.

## 8. Ownership Boundary

Edge Functions own request authentication and module-state transport. Postgres
owns row authorization. The orchestrator owns audit persistence and worker
health. Callers may not override tenant identity or resolved webhook addresses.

## 9. Data Flow

Credentials arrive in headers, authorization runs before dispatch, user JWTs
scope module queries through RLS, audit fields project into `audit_logs` with
the extended envelope under `metadata._audit`, and the worker health process
checks Temporal directly.

## 10. Contracts

- MCP credentials: `Authorization: Bearer` or `x-api-key`; no URL credential.
- Audit storage: `id`, `actor_id`, `action_type`, `resource_type`,
  `resource_id`, `metadata`, `created_at`.
- OmniSkills storage: `user_entitlements`, `user_generated_skills`.
- Health: exit zero only after Temporal reports healthy.

## 11. Failure Modes

Missing MCP secret, invalid credential, disallowed origin, RLS/query failure,
audit write/read failure, Temporal outage, and webhook transport failure all
fail explicitly. Sanitized logs exclude credential and custom metadata values.

## 12. Observability

HTTP status, Edge Function logs, typed audit exceptions, sanitized fallback
receipts, container health status, CI regression tests, and Supabase advisors.

## 13. Rollback Strategy

Revert and redeploy code. Reverse database behavior only through a new forward
migration restoring prior function modes and policies. Preserve audit records.

## 14. Security Impact

Removes fail-open and URL-secret behavior, reduces definer execution, enforces
caller-bound RLS, removes privileged functions from the exposed API schema, and
prevents proxy-based SSRF pin bypass.

## 15. Scalability Impact

Constant-time credential comparison and bounded module queries add negligible
overhead. Temporal health checks run at the existing container interval.

## 16. AI Impact

No model decision or autonomous privilege is added. MCP tools retain existing
permissions behind stronger authentication and auditability.

## 17. IN SCOPE

- MCP auth/CORS, OmniSkills state, audit persistence/query, worker health,
  webhook pinning, RPC invoker/RLS hardening, tests, and operations docs.

## 18. OUT OF SCOPE

- New product capabilities, bulk performance-advisor mutation, and changes to
  customer billing or model-selection behavior.

## 19. Success Metrics

All PR checks pass; negative auth tests return `401`; audit failures raise;
health fails on Temporal outage; four RPCs are invoker and deny anonymous use.

## 20. Architecture Review Checklist

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

## 21. Approval

Product Owner: Pending PR review
Architecture Reviewer: Pending PR review
Security Reviewer: Pending PR review
Operations Reviewer: Pending PR review
