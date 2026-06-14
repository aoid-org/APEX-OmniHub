---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# PROMPT 06: OmniLink/OmniPort Edge Ingress Validation

## Mission
Make OmniLink/OmniPort a typed, authenticated, tenant-safe, idempotent, and audited production edge surface. 

## Success Criteria
- [x] Standardize edge function capabilities.
- [x] Integrate `module-state` and keys operations (`list`, `revoke`, `rotate`).
- [x] Enforce capability requirements on incoming payload endpoints.
- [x] Pass security validation.

## Execution
- Modified `omnilink-port/index.ts` edge function to properly parse request types.
- Implemented handler routines for `module-state`, `keys list`, `keys revoke`, and `keys rotate`.
- Enabled hybrid tenant resolution supporting both API Key integration and JWT user sessions natively.
