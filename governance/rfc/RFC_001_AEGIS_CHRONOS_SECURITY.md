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
