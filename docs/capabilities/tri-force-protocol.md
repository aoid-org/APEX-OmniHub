<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# Tri-Force Protocol

**Connect · Translate · Execute**

---

## What this is in the repository

The Tri-Force Protocol is the conceptual framing used across the OmniHub codebase for how data enters the system, is normalized, and is executed. In practice, the three layers map to concrete modules in `src/omniconnect`:

- **Connect**: Runtime-validated ingress sources (text, voice, webhook) defined in the OmniPort ingress schemas.
- **Translate**: Canonical event translation and verification in the semantic translator.
- **Execute**: OmniPort’s ingestion pipeline, including idempotency, zero-trust checks, and delivery.

This document focuses on those concrete implementations rather than aspirational features.

---

## Connect (Ingress Sources)

**Implementation evidence**

- `RawInput` is a discriminated union of `text`, `voice`, and `webhook` inputs validated with Zod schemas.
- Input validation helpers (`validateRawInput`, `safeValidateRawInput`) are provided for defensive parsing at the perimeter.

**Files**
- `src/omniconnect/types/ingress.ts`

---

## Translate (Canonical Normalization)

**Implementation evidence**

- `CanonicalEvent` provides a typed, normalized schema for downstream processing.
- `SemanticTranslator` includes a deterministic pseudo-translation step with a verification pass (forward/back translate check) and a failure path that annotates risk metadata.

**Files**
- `src/omniconnect/types/canonical.ts`
- `src/omniconnect/translation/translator.ts`

---

## Execute (Ingestion Pipeline)

**Implementation evidence**

- OmniPort orchestrates the ingestion pipeline with explicit steps for zero-trust validation, idempotency wrapping, normalization, and delivery.
- The pipeline emits structured outcomes (`accepted`, `blocked`, `buffered`) and risk lanes (`GREEN`, `RED`).

**Files**
- `src/omniconnect/ingress/OmniPort.ts`
- `src/omniconnect/types/ingress.ts`

---

## Related UI pages

- `apps/omnihub-site/src/pages/TriForce.tsx`
- `apps/omnihub-site/src/pages/Home.tsx` (capability grid)

---

## Current status

The Tri-Force Protocol is documented and partially implemented through OmniPort, canonical events, and the semantic translator. The translation layer currently uses deterministic placeholder logic and includes a `TODO` marker for full translation logic.
