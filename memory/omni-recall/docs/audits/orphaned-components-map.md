---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Orphaned Components Map
Date: 2026-06-01

The following components were found in `dashboard/components` but are currently orphaned (not wired into the primary application shell or router). We keep them as they are part of the APEX UI library, but we must ensure they do not cause routing errors or dead code warnings.

## Audited Components

- `AuthModule.tsx`
- `PhysiOmniModule.tsx`
- `AuditsModule.tsx`
- `AutomationsModule.tsx`
- `BillingModule.tsx`

## Guardrails

- All module exports must be wrapped in error boundaries or safely lazy-loaded by `ModuleRegistry.ts`.
- Components that mock data have been marked `[LOCAL]` or fully stubbed to honest states to prevent fake success states.
