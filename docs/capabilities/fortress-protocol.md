<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# Fortress Protocol

**Zero-trust security by default**

---

## What this is in the repository

Fortress Protocol is the security framing used across OmniHub. The implemented pieces in this repository focus on device risk assessment, zero-trust validation, and defensive error handling in the ingress path.

This page lists the concrete security modules that exist today.

---

## Zero-trust device registry

**Implementation evidence**

- Devices are tracked with `trusted`, `suspect`, or `blocked` statuses.
- The registry persists locally and syncs to Supabase with retry/backoff behavior.
- A baseline risk computation exists for user/device activity logs.

**Files**
- `src/zero-trust/deviceRegistry.ts`
- `src/zero-trust/baseline.ts`

---

## Enforcement in OmniPort

**Implementation evidence**

- OmniPort validates device identity before processing input and throws a `SecurityError` when a device is blocked.
- Suspect devices are explicitly routed into a higher risk lane.

**Files**
- `src/omniconnect/ingress/OmniPort.ts`
- `src/omniconnect/types/ingress.ts`

---

## Related UI pages

- `apps/omnihub-site/src/pages/Fortress.tsx`
- `apps/omnihub-site/src/pages/Home.tsx` (capability grid)
