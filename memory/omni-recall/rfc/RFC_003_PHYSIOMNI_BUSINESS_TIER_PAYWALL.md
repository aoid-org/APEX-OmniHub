---
version: 1.0.0
status: approved
last_audited: 2026-06-23
---

# RFC-003: PhysiOmni Business+ Tier Paywall Gating

**Owner:** APEX Product + Security Engineering
**Date:** 2026-06-23
**Related PR:** fix/release-gate-claim-hygiene-omniskills-v2

---

## Problem

PhysiOmni (`/physiomni`) was accessible to any authenticated user regardless of subscription tier. The feature coordinates physical-world sensor hardware (nRF9161-DK, ADXL345) and can trigger MAN_MODE escalation via webhooks. Unrestricted access violates the APEX zero-trust principle: any capability that controls or claims to coordinate physical-world behaviour must be Business+ and fail-closed.

## Tier Access Matrix

| Tier | Module | Pilot | Hardware Control |
|------|--------|-------|-----------------|
| free | Locked | — | — |
| starter | Locked | — | — |
| pro ($99 CAD/mo) | Preview + waitlist CTA | — | — |
| business ($299 CAD/mo) | Full pilot access | ✓ | MAN approval (server-side) |
| enterprise (custom) | Full + custom deploy | ✓ | ✓ + MAN + audit log |

## Changes

### DB (additive migration only)
- `supabase/migrations/20260623000000_add_business_subscription_tier.sql`
  — Adds `'business'` to `subscription_tier` enum via `ADD VALUE IF NOT EXISTS`.
  No DROP, no TRUNCATE, no breaking ALTER. Safe on live data.

### Frontend
- `apps/omnihub-site/src/hooks/usePlan.ts` — Fetches `subscriptions.tier` from Supabase. Fail-closed to `'free'` on any error, unauthenticated state, or missing row.
- `apps/omnihub-site/src/components/physiomni/PhysiOmniGate.tsx` — Paywall shell with 4 distinct states (locked, preview, pilot, enterprise). No real module content renders below `pro`.
- `apps/omnihub-site/dashboard/components/modules/PhysiOmniModule.tsx` — Wrapped with `<PhysiOmniGate>`.
- `src/features/registry.ts` — `requiredScopes` documents `plan:business` gate.

### Tests
- `tests/physiomni/physiomni-paywall.spec.ts` — 8 unit tests covering full tier matrix and fail-closed coercion guarantees.

## Failure Modes

- Any Supabase error → resolves to `'free'` (fail-closed, no optimistic upgrade)
- Unauthenticated → resolves to `'free'`
- Unknown tier string from DB → coerced to `'free'`
- Loading state → gate shows spinner, blocks all content

## Security Impact

Reduces blast radius of any future entitlement escalation bug: even if a user somehow obtains a `pro` session token, PhysiOmni pilot controls remain behind the `business` check. Hardware control requires `enterprise` tier AND server-side MAN approval — both must pass independently.

## Rollback

Revert the migration is not required for a rollback — removing `PhysiOmniGate` from `PhysiOmniModule.tsx` and deploying restores open access. The `business` enum value is additive and causes no harm if left in the DB after rollback.
