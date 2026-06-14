---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Correction — OmniBoard is dual-surface, not integration-only

- date: 2026-06-10
- scope: project-wide (all OmniBoard references in docs, skill descriptions, prompts)

## Original wrong assumption
An E2E execution prompt (and the first build of the
`apex-universal-sync-orchestrator` skill) carried the platform-wide
constraint: "OmniBoard is strictly for application integration and
onboarding — not for clients." Skill files repeated it as "OmniBoard is
never client-facing." `docs/platform/OMNIBOARD.md` similarly described
OmniBoard only as a connect-only onboarding engine, with no mention of the
client-facing surface.

## Corrected state
OmniBoard is a **dual-surface system** (user-stated, verified against code):

1. **Client-facing endpoint widget** — first widget in the locked OmniDash
   left-sidebar rail (`omnidash-sidebar-widgets.ts`, id `omniboard`,
   `moduleKey: null`). Selecting it focuses the persistent OmniBoard canvas;
   the conversational `OmniBoardWizard.tsx` modal opens via OmniSpatialHost
   and is driven by typed prompts (voice capture on the dashboard surface is
   via `RecordButton`). A direct user-interaction surface.
2. **Application integration layer** — connect FSM
   (`/omniboard/start`, `/omniboard/{session_id}/next`) outputs a verified
   Connection Spec; downstream payload normalization into APEX-OmniHub state
   vectors is performed by `.claude/skills/apex-universal-sync-orchestrator`.

Accurate scoping rules going forward:
- Integration-pipeline skills scope themselves to application integration
  and state they do not handle client interactions (function boundary).
- Product-level descriptions of OmniBoard must present both surfaces.
- The phrase "OmniBoard is never client-facing" must not reappear.

## Affected pages
- `.claude/skills/apex-universal-sync-orchestrator/` (SKILL.md, README.md — fixed in commit `e747507`)
- `docs/platform/OMNIBOARD.md` (reworked to dual-surface, 2026-06-10)
- `docs/skill-forge-implementation.md` (Relationship-to-OmniBoard section added)
- `docs/architecture/CANONICAL_TRUTH.md` (fact 19 added)
- `docs/README.md` (module table row)

## Promotion decision
Canonical fact (CANONICAL_TRUTH.md fact 19) + this ledger entry. Permanent.
