---
name: apex-universal-sync-orchestrator
description: Synchronizes external application JSON payloads into unified APEX-OmniHub state vectors for OmniBoard application integration and onboarding. Use when mapping external API schemas, normalizing disjointed app data, or initializing OmniBoard app sync. Does not cover client onboarding, direct database migrations, or CSV/PDF parsing.
license: Proprietary - APEX Business Systems Ltd.
---

# APEX Universal Sync Orchestrator

Normalize one external application's JSON payload into a unified APEX-OmniHub
state vector, ready for OmniBoard application integration and onboarding.
OmniBoard is strictly for application integration — never client-facing.

## Contract

- **Input:** a payload JSON file and a mapping schema JSON file (paths passed
  as the two positional arguments to `scripts/sync_payload.py`).
- **Output:** a normalized state vector printed to stdout as JSON, containing
  a deterministic `omni_id`, the mapped fields, and `meta.fields_mapped`.
- **Success:** exit code 0 with the normalized JSON on stdout.
- **Fails when:** the schema lacks a `field_mappings` dict (`SCHEMA ERROR`),
  the payload is missing `source_system`, `sync_timestamp`, or `data_payload`
  (`PAYLOAD ERROR`), or one or more field mappings cannot be applied (one
  `FIELD_NAME: reason` line per violation, exit code 1).

## Workflow

Follow this decision tree in order — schema validation always comes first:

1. **Validate the mapping schema.** Load the schema JSON. If `field_mappings`
   is missing or not a dict, stop: report `SCHEMA ERROR` and exit 1. Nothing
   else runs against an invalid schema.
2. **Validate the payload envelope.** Confirm `source_system`,
   `sync_timestamp`, and `data_payload` are all present. Report one
   `PAYLOAD ERROR: missing required field '<name>'` line per absent field.
3. **Apply field mappings.** For each entry in `field_mappings`, read the
   `source_field` from `data_payload` and coerce it to the declared `type`
   (`string`, `integer`, `float`, `boolean`). Collect every violation before
   reporting — a full report saves a re-run cycle.
4. **Generate `omni_id`.** Format is `{source_system}_{epoch_digits}` where
   `epoch_digits` are the digits extracted from `sync_timestamp`. The value
   is deterministic, so a re-sync of the same payload deduplicates cleanly.
5. **Emit the state vector.** Print the normalized JSON to stdout, exit 0.

## Run it

```bash
python3 scripts/sync_payload.py <payload.json> <mapping_schema.json>
```

Verify a successful run with:

```bash
python3 scripts/sync_payload.py payload.json schema.json | python3 -m json.tool
echo "exit: $?"
```

Exit 0 plus an `omni_id` key in the output confirms a valid normalization.

## Failure handling

- **Empty `data_payload`:** a warning is written to stderr and processing
  continues — an empty payload is a valid initial state for a brand-new
  integration. The state vector is emitted with zero mapped fields.
- **Optional field absent:** mappings marked `"optional": true` fall back to
  their schema `default` value (for example `null` for free-text notes).
  No violation is raised.
- **Required field absent:** a `FIELD_NAME: required field missing from
  data_payload` violation is recorded; all other mappings still run so the
  report covers every problem in a single pass.
- **Type coercion failure:** the offending field and value are reported as
  `FIELD_NAME: cannot coerce <value> to <type>`; remaining fields still map.

## References

- `references/payload-mapping-schema.md` — required payload fields, the
  `field_mappings` structure, supported type coercions, optional-field
  behavior, and the `omni_id` generation rules.
