<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# Maestro

**Intent execution with validation and risk routing**

---

## What this is in the repository

Maestro is the intent execution layer implemented under `src/integrations/maestro`. It validates intents, applies allowlist rules, performs injection detection, and executes actions (currently mocked) with explicit success/error responses.

---

## Intent model

**Implementation evidence**

- `MaestroIntent` defines the required fields for execution, including identity, idempotency keys, translation status, and confidence.
- Risk lanes (`GREEN`, `YELLOW`, `RED`, `BLOCKED`) are part of the type system for downstream routing.

**Files**
- `src/integrations/maestro/types.ts`

---

## Validation and execution

**Implementation evidence**

- `validateIntent` enforces idempotency key format, identity presence, locale format (BCP-47), confidence ranges, and allowlisted actions.
- Injection detection is performed against serialized parameters, producing warnings or blocking behavior.
- `executeIntent` returns structured outcomes with risk-lane metadata and stops batch execution on blocked `RED` results.

**Files**
- `src/integrations/maestro/execution/engine.ts`
- `src/integrations/maestro/safety/injection-detection.ts`
- `src/integrations/maestro/safety/risk-events.ts`

---

## MAN Mode integration

**Implementation evidence**

- MAN Mode request/response structures are defined for escalation and approval flows.

**Files**
- `src/integrations/maestro/types.ts`

---

## Related UI pages

- `apps/omnihub-site/src/pages/Maestro.tsx`
- `apps/omnihub-site/src/pages/Home.tsx` (capability grid)
