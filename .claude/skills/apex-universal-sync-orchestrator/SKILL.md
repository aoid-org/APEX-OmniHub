---
name: apex-universal-sync-orchestrator
description: Synchronizes external application JSON payloads into unified APEX-OmniHub state vectors for OmniBoard application integration and onboarding. Use when mapping external API schemas, normalizing disjointed app data, or initializing OmniBoard app sync. Does not cover client-facing OmniBoard interactions, direct database migrations, or CSV/PDF parsing.
license: Proprietary - APEX Business Systems Ltd.
---

## Overview

Normalizes external application JSON payloads into APEX-OmniHub state vectors, enabling
reliable OmniBoard integration pipeline onboarding. Targets the application integration
layer — not the OmniBoard client-facing conversational modal.

## Input / Output / Success / Fails-when

**Input:** External app JSON payload (`source_system`, `sync_timestamp`, `data_payload`)
and a mapping schema JSON file containing a `field_mappings` dict.

**Output:** Normalized state vector JSON with `omni_id`, typed fields, and
`meta.fields_mapped` count written to stdout; exit 0 on success.

**Success:** All required payload fields present, all mappings applied without violation,
`omni_id` generated deterministically, output is valid JSON.

**Fails-when:** `field_mappings` key missing or not a dict in schema; required payload
fields (`source_system`, `sync_timestamp`, `data_payload`) absent; non-optional mapped
source fields not found in `data_payload`.

## Workflow Decision Tree

```
1. Load schema JSON
   ├── SCHEMA ERROR: field_mappings missing or not dict → exit 1
   └── OK → continue

2. Load payload JSON
   ├── PAYLOAD ERROR: source_system missing → exit 1
   ├── PAYLOAD ERROR: sync_timestamp missing → exit 1
   ├── PAYLOAD ERROR: data_payload missing → exit 1
   └── OK → continue

3. data_payload empty?
   ├── Yes → warn to stderr ("WARNING: data_payload is empty"), continue
   └── No → apply field mappings

4. For each field mapping:
   ├── source_field present → apply type coercion (string/integer/float/boolean)
   ├── source_field absent + optional → use schema default value
   └── source_field absent + required → collect violation

5. Violations collected?
   ├── Yes → print all violations, exit 1
   └── No → generate omni_id, write JSON to stdout, exit 0
```

## Verification Command

```bash
python3 scripts/sync_payload.py <input_json_path> <mapping_schema_path>
echo "EXIT CODE: $?"
```
Exit 0 = success (JSON on stdout). Exit 1 = violations or errors printed to stdout.

## Failure Handling

- **Empty `data_payload`:** Emits `WARNING: data_payload is empty` to stderr, continues
  execution — an empty payload is a valid initial state for a new integration.
- **Optional missing field:** Uses the `default` value from schema (may be `null`).
- **Required missing field:** Collects `FIELD_NAME: required field missing from data_payload`;
  all violations are reported before exit 1 — no early termination.

## References

See `references/payload-mapping-schema.md` for: required payload fields, `field_mappings`
structure, supported type coercions, optional field behavior, `omni_id` generation rules.
