# apex-universal-sync-orchestrator

Normalizes external application JSON payloads into unified APEX-OmniHub state vectors so new apps can be onboarded into OmniBoard without manual field mapping.

## Install

```bash
npx skills add https://github.com/apexbusiness-systems/APEX-OmniHub --skill apex-universal-sync-orchestrator
```

Claude Code: `/plugin marketplace add apexbusiness-systems/APEX-OmniHub` | claude.ai: upload `dist/apex-universal-sync-orchestrator-1.0.0.skill` under Settings → Capabilities.

## Before / After

**Task**: Onboarding a new external application (e.g., Salesforce CRM) into OmniBoard — mapping 12 disparate API fields into APEX-OmniHub state format.

| | Without skill | With skill |
|---|---|---|
| Field mapping setup | Manual — developer reviews API docs, writes mapping code by hand, tests against live data | Agent runs `sync_payload.py` with a declarative mapping schema, outputs normalized state vector in one pass |
| Error visibility | Mapping failures appear at runtime in OmniBoard with minimal context | Full violation report per field before any data enters OmniBoard |
| Re-sync deduplication | Ad hoc — depends on developer implementing ID logic | Deterministic `omni_id` generated from `source_system` + `sync_timestamp` on every run |

## What it does

- Validates that incoming payloads include `source_system`, `sync_timestamp`, and `data_payload` before any mapping begins
- Applies declarative field mappings with type coercion (`string`, `integer`, `float`, `boolean`) and optional-field defaults
- Generates a deterministic `omni_id` for deduplication across re-sync runs
- Collects all mapping violations in one pass and reports them with field-level precision
- Handles empty `data_payload` gracefully — emits a warning and continues for new app initial states

## Verify the package

```bash
python3 scripts/sync_payload.py sample_payload.json mapping_schema.json && echo SYNC_OK
```

---
Built with **APEX Skill Forge v9.4.0** — Production skill engineering for APEX-OmniHub.
APEX Business Systems Ltd., Edmonton, Alberta, Canada. (c) 2026. All rights reserved.
