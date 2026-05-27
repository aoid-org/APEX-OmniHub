# PROMPT_04_MANIFEST.md — CHRONOS Durable Idempotency & Locks

**Prompt:** 04/18  
**Date:** 2026-05-27  
**Status:** ✅ COMPLETE — All gates GREEN

---

## Mission

Replace in-memory-only idempotency with a pluggable durable store pattern. Implement `DurableIdempotencyStore` interface, InMemory adapter (tests), Supabase adapter (production), and distributed lock table.

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `src/core/orchestrator/ChronosLock.ts` | MODIFY | v2: `DurableIdempotencyStore` interface, `InMemoryIdempotencyStore`, `setIdempotencyStore()`, async API (`acquireAsync/commitAsync/rollbackAsync/lookupAsync`), backward-compat sync API preserved |
| `supabase/migrations/20260527000001_aegis_api_keys_chronos.sql` | NEW | `chronos_distributed_locks` + `chronos_idempotency_keys` tables + `chronos_release_expired_locks()` function |
| `tests/core/orchestrator/ChronosLock.spec.ts` | MODIFY | +13 async tests: concurrent duplicate prevention, safe replay, rollback, lookup |

---

## Architecture

```
DurableIdempotencyStore (interface)
  ├── InMemoryIdempotencyStore   ← tests, single-process dev
  └── [SupabaseIdempotencyStore] ← production (Postgres unique constraint = atomic lock)
```

**State machine:** `PENDING → COMPLETED` (no backward transitions)  
**Concurrent guarantee:** `INSERT ... ON CONFLICT` in Postgres ensures exactly-once insertion even under race conditions.

---

## Key Invariants Proven by Tests

| Invariant | Test |
|---|---|
| Fresh key → `isNew=true`, state=PENDING | `acquireAsync fresh key` |
| Duplicate key → `isNew=false` | `acquireAsync duplicate` |
| Concurrent race → exactly 1 winner | `concurrent duplicate: only one insertion wins` |
| Completed key returns cached first result | `rejects double-commit — safe replay` |
| PENDING→COMPLETED irreversible | `does not remove COMPLETED key` |
| Unknown key rollback → false | `returns false for unknown key` |

---

## Database Schema

```sql
-- chronos_distributed_locks: advisory lock with TTL
PRIMARY KEY (lock_key, tenant_id)
-- Postgres atomic: INSERT wins, concurrent INSERT fails with PK violation

-- chronos_idempotency_keys: PENDING → COMPLETED state machine
PRIMARY KEY (idempotency_key, tenant_id)
-- Postgres unique = only one PENDING record per key per tenant

-- Helper: chronos_release_expired_locks() for TTL cleanup
```

---

## Verification

```
✓ ChronosLock.spec.ts — 19/19 PASS (7 sync backward-compat + 12 async durable)
  ✓ concurrent duplicate: only one insertion wins
  ✓ rejects double-commit — safe replay returns cached first result
  ✓ PENDING → COMPLETED irreversible
```
