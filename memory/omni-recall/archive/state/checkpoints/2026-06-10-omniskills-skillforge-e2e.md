---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Checkpoint — 2026-06-10 — OmniSkills/SkillForge/DAG E2E + OmniBoard scoping correction + doc sync

- branch: claude/friendly-goodall-6bb4uc
- commits: 9b911dc (skill v1.0.0), e747507 (OmniBoard scoping fix), plus this doc-sync commit
- session_type: full E2E test execution (20 machine-verifiable pass criteria) + documentation audit

## Scope
1. Verified the complete OmniSkills → SkillForge → DAG path against source:
   UI entry (`OmniSkillsModule.tsx`, `ModuleRenderer.tsx`, `SkillForgeWidget.tsx`,
   `Launch/SkillForge.tsx`), backend (`generate-business-skills` edge function,
   `20260214000001_skill_forge_protocol.sql`), DAG/Saga (`agent_saga.py`,
   `server.py`, `apex-agent`, `workflow-api.ts` detectCycle).
2. Forged, validated, and installed `.claude/skills/apex-universal-sync-orchestrator`
   (rubric 100/100, lint 0/0, APEX policy gate pass, packed `.skill` + sha256).
3. Executed the sync engine live: valid Salesforce payload → exit 0 with
   `omni_id salesforce_20260610090000`, float/boolean coercion, null default,
   `fields_mapped: 6`. Three violation scenarios → exit 1 with field-precise
   messages. Empty `data_payload` → warn + exit 0.
4. Simulated Kahn cycle detection (false on linear DAG, true with back-edge)
   and Saga rollback (LIFO dispatch, concurrent via asyncio.gather, proven by
   completion-order inversion at ~101ms wall).
5. Applied the OmniBoard widget correction (see
   `wiki/corrections/004-omniboard-dual-surface-scoping.md`) and re-ran the
   entire workflow; skill rebuilt with function-boundary scoping.
6. Documentation audit + sync (this commit): `docs/platform/OMNIBOARD.md`
   reworked to integration modal; `docs/skill-forge-implementation.md` corrected
   (UUID skill names, live Anthropic generation, `/launch/skillforge` route,
   all three UI surfaces, optimistic entitlement increment);
   `CANONICAL_TRUTH.md` facts 19–20 added; `docs/README.md` row updated.

## Verified facts (2026-06-10)
- skill_name_pattern: `skill_${crypto.randomUUID()}` (full UUID — timestamp-style names in older docs were drift)
- skill_generation: live Anthropic `claude-3-5-haiku-20241022` (max_tokens 1024); 422 on failure; NOT mocked
- edge_insert_fields: `{ user_id, name, trigger_intent, definition }` only
- entitlement_response: `used = current + 1` (optimistic, not post-insert read)
- component_routing: `MODULE_COMPONENTS` in `ModuleRenderer.tsx` (NOT `ModuleRegistry.ts`)
- widget_success: closes dialog (`resetForm()` + `setOpen(false)`); Step 4 exists only in full-page `Launch/SkillForge.tsx`
- saga_rollback: `reversed(compensation_stack)` → `asyncio.gather` — LIFO dispatch, concurrent, best-effort (`agent_saga.py:221-222`)
- cycle_error: `'Workflow contains a cycle. DAG must be acyclic.'` (`workflow-api.ts:136`)
- policy_gate_gotcha: `apex_policy_check.py` accepts FILE paths only — a directory arg silently scans 0 files and exits 0; always enumerate files
- omniboard: integration surface (client modal for integrations)
