# PROMPT_03_MANIFEST.md — Spectre, AEGIS, VERITAS Fail-Closed Security

**Prompt:** 03/18  
**Date:** 2026-05-27  
**Status:** ✅ COMPLETE — All gates GREEN

---

## Mission

Eliminate spoofable authentication. Replace prefix-only token trust with zero-trust API key validation, sealed GOD_MODE break-glass, and Zod-enforced action envelope schema.

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `src/core/security/SpectreHandshake.ts` | MODIFY | Full rewrite: async zero-trust API key auth, timing-safe comparison, GOD_MODE break-glass |
| `src/core/security/AegisMatrix.ts` | NEW | RBAC capability matrix for all TrustTiers |
| `src/core/security/VeritasSchema.ts` | NEW | Zod strict action envelope validation |
| `src/api/tools/manifest.ts` | MODIFY | `handleManifestRequest` made async |
| `src/core/gateway/ApexRealtimeGateway.ts` | MODIFY | `handleUpgrade` made async |
| `supabase/migrations/20260527000001_aegis_api_keys_chronos.sql` | NEW | `aegis_api_keys` table with RLS |
| `tests/core/security/SpectreHandshake.spec.ts` | MODIFY | 12 tests: format, timing-safe, revoke, expiry, break-glass |
| `tests/api/tools/manifest.spec.ts` | MODIFY | Async tests with AegisKeyStore mock |
| `tests/core/gateway/ApexRealtimeGateway.spec.ts` | MODIFY | Async tests with AegisKeyStore mock |

---

## Security Eliminations

| Removed | Risk Eliminated |
|---|---|
| `Bearer apex_sk_` prefix-only trust | Attacker forges any key matching the prefix |
| Client-controlled `x-apex-device-id` → TrustTier | Attacker sets `apex-admin` to elevate to GOD_MODE |
| `DEVICE_CLASSIFICATIONS` hardcoded map | No runtime revocation possible |
| Synchronous `authenticate()` | Blocked real database validation |

---

## Security Additions

| Added | Guarantee |
|---|---|
| `ak_live_[tenantId]_[secret32]` format | Namespaced, un-forgeable without DB record |
| `timingSafeEqual` hash comparison | Eliminates timing oracle attacks |
| `AegisKeyStore.lookupKey(prefix)` | Keys validated against DB; revocation instant |
| `status` check (active/revoked/expired) | Revoked keys rejected without timing leaks |
| `expiresAt` check | Keys can be time-bounded |
| `x-apex-break-glass: true` header gate | GOD_MODE requires explicit opt-in |
| `AegisMatrix.ts` | Canonical RBAC capability map |
| `VeritasSchema.ts` | Unknown actions fail closed via Zod |

---

## Verification

```
✓ SpectreHandshake.spec.ts — 12/12 PASS
✓ manifest.spec.ts         — 6/6 PASS
✓ ApexRealtimeGateway.spec.ts — 16/16 PASS
```
