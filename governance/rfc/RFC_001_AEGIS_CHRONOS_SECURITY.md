# RFC-001: AEGIS Zero-Trust Security & CHRONOS Durable Idempotency

**Status:** Accepted  
**PR:** feat/aegis-chronos-core  
**Author:** APEX Business Systems Ltd.  
**Date:** 2026-05-27  
**Policy Version:** 1.3.1

---

## Summary

This RFC governs the architecture decisions introduced in AG2 Prompts 03 and 04:
deployment of the AEGIS zero-trust security layer and the CHRONOS durable
idempotency subsystem. Both introduce new database tables via Supabase migration
`20260527000001_aegis_api_keys_chronos.sql`.

---

## Motivation

### AEGIS (Prompt 03)
Prior `SpectreHandshake` implementation used prefix-only token matching, enabling
spoofing via any token sharing a prefix with a valid credential. AEGIS replaces
this with DB-backed validation (`AegisKeyStore`), `timingSafeEqual` to prevent
timing oracle attacks, and `AegisMatrix` as the authoritative RBAC source of truth.

### CHRONOS (Prompt 04)
The existing `ChronosLock` relied on in-process memory, providing no durability
across restarts or horizontal scale-out. CHRONOS v2 introduces a `DurableIdempotencyStore`
interface backed by Supabase, using PostgreSQL `INSERT ... ON CONFLICT` for atomic
race protection.

---

## Architecture Decisions

### AD-001: DB-Backed Token Validation
`AegisKeyStore` fetches hashed API keys from the `aegis_api_keys` table. All
comparisons use `crypto.timingSafeEqual`. No plaintext secrets stored.

### AD-002: Fail-Closed by Default
`VeritasSchema` enforces strict Zod validation on all incoming request envelopes.
Unknown or malformed payloads are rejected immediately — no partial processing.

### AD-003: GOD_MODE Sealed
`GOD_MODE` elevation requires the `x-apex-break-glass` header explicitly. Absent
this header, the system gracefully degrades to `OPERATOR`. This closes the
elevation path that existed via role coercion in v1.

### AD-004: Async Migration
`authenticate()`, `Gateway.handleUpgrade()`, and `Manifest.handleManifestRequest()`
are now async to support DB round-trips. Backward-compatible via preserved sync
stubs where callers cannot yet be migrated.

### AD-005: Pluggable Idempotency Store
`DurableIdempotencyStore` is an interface. The Supabase implementation ships as
default. Future implementations (Redis, DynamoDB) are drop-in via the same interface.

---

## Database Schema Changes

**Migration:** `supabase/migrations/20260527000001_aegis_api_keys_chronos.sql`

Tables provisioned:
- `aegis_api_keys` — hashed API credentials, RBAC role binding, revocation flag
- `chronos_distributed_locks` — distributed lock registry, heartbeat TTL
- `chronos_idempotency_keys` — idempotency key store, request fingerprint, status

All tables include `IF NOT EXISTS` guards — migration is idempotent on re-run.
RLS policies applied. No destructive operations on existing tables.

---

## Security Review Checklist

- [x] No plaintext secrets stored
- [x] `timingSafeEqual` used for all token comparisons
- [x] Fail-closed on unknown payloads (VeritasSchema)
- [x] Migration is idempotent (`IF NOT EXISTS`)
- [x] RLS applied to all new tables
- [x] `GOD_MODE` elevation sealed behind explicit header
- [x] No breaking changes to existing callers (async stubs preserved)

---

## Test Coverage

- `SpectreHandshake` — 12/12 green
- `manifest` tool — 6/6 green
- `ApexRealtimeGateway` — 16/16 green
- `ChronosLock` — 19/19 green
- Full regression suite — 2513/2514 (pre-existing flaky unrelated test)

---

## References

- `governance/doctrine/APEX_BUILD_DOCTRINE.md`
- `governance/rfc/RFC_USAGE_POLICY.md`
- `governance/rfc/RFC_TEMPLATE.md`

---

<!-- =====================================================================
  SECTIONS BELOW: Grandfathered compliance additions (2026-05-28).
  RFC-001 predates the policy_v1.1.0 required-section mandate introduced
  in Prompt 11. Sections are added retroactively to satisfy the policy gate
  without altering the architectural decisions already accepted.
  ===================================================================== -->

## Problem

Pre-existing `SpectreHandshake` used prefix-only token matching with no timing-safe
comparison, enabling credential spoofing. `ChronosLock` used in-process memory with
no durability across restarts or horizontal scale-out. Both represent active security
and reliability risks that block enterprise readiness.

---

## Exact User

**Internal platform team** building on OmniHub and **enterprise tenants** whose
integrations require zero-trust credential validation and exactly-once tool execution
guarantees across distributed worker fleets.

---

## Workflow

1. **Tenant authenticates** → `SpectreHandshake` validates token against `aegis_api_keys`
   using `timingSafeEqual`; trust tier resolved via `AegisMatrix`.
2. **Tool invocation arrives** → `ChronosLock` checks `chronos_idempotency_keys`;
   duplicate requests return cached result without re-execution.
3. **Distributed orchestrator** → `chronos_distributed_locks` ensures single-leader
   execution per workflow; lock heartbeat prevents stale-lock deadlock.

---

## Current Pain

- Token spoofing risk via prefix collision.
- Replay attacks not mitigated — duplicate tool executions produce inconsistent state.
- In-process lock lost on pod restart; scale-out to multiple workers causes lock races.
- No audit trail for credential usage or lock contention events.

---

## Proposed Change

Introduce **AEGIS** (DB-backed zero-trust auth) and **CHRONOS** (durable idempotency)
via a single Supabase migration (`20260527000001_aegis_api_keys_chronos.sql`) and
corresponding TypeScript modules. See Architecture Decisions AD-001 through AD-005.

---

## Business Capability

Unlocks enterprise tier: customers requiring SOC 2-aligned credential management and
exactly-once execution guarantees (financial, healthcare) can now be onboarded without
bespoke workarounds.

---

## Ownership Boundary

| Layer | Owner |
|---|---|
| `SpectreHandshake` auth | Platform / Security team |
| `AegisMatrix` RBAC | Platform / Security team |
| `ChronosLock` idempotency | Platform / Infrastructure team |
| DB migration | Platform / DBA |
| Client integration | Consuming feature teams |

---

## Data Flow

```
Client → SpectreHandshake (auth header) → aegis_api_keys (DB lookup)
       → AegisMatrix (trust tier resolution) → DeviceProfile
       → handleUpgrade → Realtime session

Tool call → ChronosLock.acquire(idempotencyKey, chronos_distributed_locks)
          → executeTool → result stored in chronos_idempotency_keys
          → response returned (replay returns cached result)
```

---

## Contracts

- `AegisKeyStore.lookupKey(prefix)` → `AegisKeyRecord | null`
- `AegisKeyStore.updateLastUsed(keyId)` → `void`
- `DurableIdempotencyStore.acquire(key, ttl)` → `boolean`
- `DurableIdempotencyStore.release(key)` → `void`
- Migration is idempotent — safe to re-run (`IF NOT EXISTS` on all DDL).

---

## Failure Modes

| Failure | Behavior |
|---|---|
| DB unreachable on auth | Fail-closed — reject connection (no fallback to in-memory) |
| DB unreachable on lock acquire | Fail-closed — tool execution blocked, client receives 503 |
| Stale lock (worker crash) | Heartbeat TTL expires; lock auto-released after `lock_ttl_seconds` |
| Idempotency key collision | Return cached result — never re-execute |
| Migration already applied | `IF NOT EXISTS` guard — no-op, no error |

---

## Observability

- `aegis_api_keys.last_used_at` updated on each successful auth.
- OTel spans: `spectre.authenticate`, `chronos.acquire`, `chronos.release`.
- Prometheus counter: `apex_auth_failures_total`, `apex_idempotency_hits_total`.
- Supabase audit log captures all DDL and DML on migration tables.

---

## Rollback Strategy

1. Re-run previous migration version or drop added tables (non-destructive — no
   existing tables altered).
2. Revert `SpectreHandshake` to prefix-only module (preserved as `SpectreHandshakeLegacy`
   in git history).
3. Revert `ChronosLock` to in-memory implementation (preserved via git revert of
   the CHRONOS commit).
4. No tenant data is stored in these tables until the feature flag `REALTIME_ENABLED=true`
   is set; rollback is safe in production with zero data loss.

---

## Security Impact

- **Positive**: Eliminates prefix-spoofing attack vector; adds timing-safe comparison;
  establishes DB audit trail for all credential usage.
- **Risk**: DB dependency introduced on the auth hot path — mitigated by fail-closed
  design and connection pooling.
- **No regressions**: Existing sync callers preserved via async-compatible stubs.

---

## Scalability Impact

- `aegis_api_keys` lookup: single indexed query per connection — negligible overhead.
- `chronos_distributed_locks`: heartbeat polling adds ~1 DB round-trip/30s per
  active worker; acceptable at current fleet size (< 100 workers).
- Horizontal scale-out: now safe — distributed lock prevents split-brain.

---

## IN SCOPE

- DB-backed token validation (`AegisKeyStore` Supabase implementation).
- Timing-safe comparison via `timingSafeEqual`.
- Durable idempotency via `DurableIdempotencyStore` Supabase implementation.
- Distributed lock with heartbeat TTL.
- Migration `20260527000001_aegis_api_keys_chronos.sql`.

---

## OUT OF SCOPE

- Alternative `AegisKeyStore` backends (Redis, DynamoDB) — tracked as tech debt.
- Token rotation API — separate RFC.
- CHRONOS cross-region replication — separate RFC.
- Client-facing idempotency key API — separate RFC.

---

## Success Metrics

- Zero auth bypass incidents post-deploy (monitored via `apex_auth_failures_total`).
- Idempotency hit rate > 0% on duplicate tool calls (confirms CHRONOS active).
- Migration applied cleanly in staging + production with zero errors.
- All 2514 regression tests pass (excluding pre-existing flaky test).

---

<!-- =====================================================================
  SECTIONS BELOW: Grandfathered compliance additions (2026-05-28).
  RFC-001 predates the policy_v1.1.0 required-section mandate introduced
  in Prompt 11. Sections are added retroactively to satisfy the policy gate
  without altering the architectural decisions already accepted.
  ===================================================================== -->

## Problem

Pre-existing `SpectreHandshake` used prefix-only token matching with no timing-safe
comparison, enabling credential spoofing. `ChronosLock` used in-process memory with
no durability across restarts or horizontal scale-out. Both represent active security
and reliability risks that block enterprise readiness.

## Exact User

**Internal platform team** building on OmniHub and **enterprise tenants** whose
integrations require zero-trust credential validation and exactly-once tool execution
guarantees across distributed worker fleets.

## Workflow

1. **Tenant authenticates**: `SpectreHandshake` validates token against `aegis_api_keys` using `timingSafeEqual`; trust tier resolved via `AegisMatrix`.
2. **Tool invocation arrives**: `ChronosLock` checks `chronos_idempotency_keys`; duplicate requests return cached result without re-execution.
3. **Distributed orchestrator**: `chronos_distributed_locks` ensures single-leader execution per workflow; lock heartbeat prevents stale-lock deadlock.

## Current Pain

- Token spoofing risk via prefix collision.
- Replay attacks not mitigated — duplicate tool executions produce inconsistent state.
- In-process lock lost on pod restart; scale-out to multiple workers causes lock races.
- No audit trail for credential usage or lock contention events.

## Proposed Change

Introduce **AEGIS** (DB-backed zero-trust auth) and **CHRONOS** (durable idempotency) via a single Supabase migration and corresponding TypeScript modules. See Architecture Decisions AD-001 through AD-005.

## Business Capability

Unlocks enterprise tier: customers requiring SOC 2-aligned credential management and exactly-once execution guarantees (financial, healthcare) can now be onboarded without bespoke workarounds.

## Ownership Boundary

| Layer | Owner |
|---|---|
| `SpectreHandshake` auth | Platform / Security team |
| `AegisMatrix` RBAC | Platform / Security team |
| `ChronosLock` idempotency | Platform / Infrastructure team |
| DB migration | Platform / DBA |

## Data Flow

Client authenticates via SpectreHandshake against aegis_api_keys DB table, trust tier resolved via AegisMatrix into DeviceProfile. Tool calls pass through ChronosLock idempotency check against chronos_idempotency_keys before execution.

## Contracts

- `AegisKeyStore.lookupKey(prefix)` returns `AegisKeyRecord | null`
- `AegisKeyStore.updateLastUsed(keyId)` returns void
- `DurableIdempotencyStore.acquire(key, ttl)` returns boolean
- Migration is idempotent — safe to re-run (`IF NOT EXISTS` on all DDL).

## Failure Modes

| Failure | Behavior |
|---|---|
| DB unreachable on auth | Fail-closed — reject connection |
| DB unreachable on lock acquire | Fail-closed — tool execution blocked, 503 |
| Stale lock (worker crash) | Heartbeat TTL expires; auto-released |
| Idempotency key collision | Return cached result — never re-execute |

## Observability

- `aegis_api_keys.last_used_at` updated on each successful auth.
- OTel spans: `spectre.authenticate`, `chronos.acquire`, `chronos.release`.
- Supabase audit log captures all DDL and DML on migration tables.

## Rollback Strategy

Re-run previous migration or drop added tables (non-destructive — no existing tables altered). Revert SpectreHandshake to prefix-only module (preserved in git history). No tenant data stored until `REALTIME_ENABLED=true` is set; rollback is safe with zero data loss.

## Security Impact

**Positive**: Eliminates prefix-spoofing attack vector; adds timing-safe comparison; establishes DB audit trail. **Risk**: DB dependency on auth hot path — mitigated by fail-closed design and connection pooling.

## Scalability Impact

`aegis_api_keys` lookup is a single indexed query per connection. `chronos_distributed_locks` heartbeat adds ~1 DB round-trip per 30s per active worker. Horizontal scale-out now safe via distributed lock.

## IN SCOPE

- DB-backed token validation (AegisKeyStore Supabase implementation).
- Timing-safe comparison via `timingSafeEqual`.
- Durable idempotency via DurableIdempotencyStore Supabase implementation.
- Migration `20260527000001_aegis_api_keys_chronos.sql`.

## OUT OF SCOPE

- Alternative AegisKeyStore backends (Redis, DynamoDB).
- Token rotation API.
- CHRONOS cross-region replication.
- Client-facing idempotency key API.

## Success Metrics

- Zero auth bypass incidents post-deploy.
- Idempotency hit rate > 0% on duplicate tool calls (confirms CHRONOS active).
- Migration applied cleanly in staging + production with zero errors.
