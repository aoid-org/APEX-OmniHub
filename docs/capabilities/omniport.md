<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# OmniPort

**Ingress/egress gateway for OmniHub**

---

## What this is in the repository

OmniPort is the ingress engine that validates inputs, normalizes them into canonical events, and delivers them through OmniLink. The implementation is in `src/omniconnect/ingress/OmniPort.ts` with supporting types and metrics helpers.

---

## Ingress pipeline

**Implementation evidence**

- Inputs are validated via Zod schemas for `text`, `voice`, and `webhook` sources.
- A zero-trust device check runs before processing and can block requests via `SecurityError`.
- Idempotency is enforced using a deterministic hash and the `withIdempotency` helper.
- Content is normalized into `CanonicalEvent` objects with metadata for risk lane and MAN Mode.
- Failed deliveries are written to a Supabase-backed dead-letter queue (`ingress_buffer`).

**Files**
- `src/omniconnect/ingress/OmniPort.ts`
- `src/omniconnect/types/ingress.ts`
- `src/omniconnect/types/canonical.ts`

---

## Metrics and status

**Implementation evidence**

- `omniport-metrics.ts` defines metrics collection for counts, latency, and health status.

**Files**
- `src/omniconnect/ingress/omniport-metrics.ts`

---

## Related UI pages

- `apps/omnihub-site/src/pages/OmniPort.tsx`
- `apps/omnihub-site/src/pages/Home.tsx` (capability grid)
