<!-- APEX_DOC_STAMP: VERSION=v8.0-LAUNCH | LAST_UPDATED=2026-02-20 -->
# MAN Mode

**Manual Authorization Needed**

---

## What this is in the repository

MAN Mode is the human-in-the-loop control used to gate high-risk actions. In this repository, MAN Mode is implemented as detection and metadata tagging during ingestion, plus explicit fields in the Maestro and OmniPort pipelines.

---

## High-risk intent detection

**Implementation evidence**

- A fixed keyword list (`delete`, `transfer`, `grant_access`) is used to flag high-risk content.
- The `detectHighRiskIntents` helper scans text payloads and returns matched intents.

**Files**
- `src/omniconnect/types/ingress.ts`

---

## MAN Mode tagging in OmniPort

**Implementation evidence**

- OmniPort analyzes ingress content, sets `requires_man_approval` in event metadata, and moves the pipeline to the `RED` risk lane when high-risk intents are detected.
- The resulting `CanonicalEvent` includes the detected intent list and risk lane for downstream decisions.

**Files**
- `src/omniconnect/ingress/OmniPort.ts`
- `src/omniconnect/types/canonical.ts`

---

## MAN Mode structures in Maestro

**Implementation evidence**

- `MANModeRequest` and `MANModeResponse` types exist to represent escalation and approval decisions.

**Files**
- `src/integrations/maestro/types.ts`

---

## Related UI pages

- `apps/omnihub-site/src/pages/ManMode.tsx`
- `apps/omnihub-site/src/pages/Home.tsx` (capability grid)
