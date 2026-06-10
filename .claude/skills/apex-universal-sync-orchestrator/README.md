# apex-universal-sync-orchestrator

APEX Business Systems — OmniBoard Application Integration Skill.

Normalizes external application JSON payloads into APEX-OmniHub state vectors for
reliable OmniBoard integration pipeline onboarding.

## Install

```bash
cp -r apex-universal-sync-orchestrator /path/to/repo/.claude/skills/
python3 scripts/sync_payload.py <input_json_path> <mapping_schema_path>
```

## Usage

Accepts two positional arguments: path to the external app JSON payload and path to the
mapping schema JSON. Outputs a normalized APEX-OmniHub state vector to stdout.
Exit 0 on success. Exit 1 with a violation report if any field mapping fails.

## Before / After

**Scenario:** Integration Engineer onboarding a Salesforce instance into OmniBoard.

**Before:**
Manual field mapping in spreadsheets. `AnnualRevenue` arrives as a string; runtime
type coercion happens inconsistently across integration scripts, producing silent
failures downstream. Missing optional fields cause unpredictable behavior in OmniBoard.
No deterministic identifier — re-syncing the same account risks duplicate state entries.
Multiple debugging cycles needed to surface which fields failed and why.

**After:**
Run `python3 scripts/sync_payload.py salesforce_payload.json mapping_schema.json`.
Every field-level violation is surfaced in one pass before any state reaches OmniBoard.
`omni_id: salesforce_2026061009` generated deterministically — safe for re-sync
deduplication at any stage. Optional fields resolve to schema defaults automatically.
An empty `data_payload` warns cleanly and continues — valid for initial integration states.

## Architecture Note

Targets the OmniBoard application integration pipeline. Does not interact with the
OmniBoard client-facing conversational modal (Left Sidebar Widget → prompt/voice input).

## License

Proprietary - APEX Business Systems Ltd.
