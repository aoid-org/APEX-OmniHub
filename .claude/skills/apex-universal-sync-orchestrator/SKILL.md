---
name: apex-universal-sync-orchestrator
description: Synchronizes external application JSON payloads into unified APEX-OmniHub state vectors for OmniBoard application integration and onboarding. Use when mapping external API schemas, normalizing disjointed app data, or initializing OmniBoard app sync. Does not cover client onboarding, direct database migrations, or CSV/PDF parsing.
license: Proprietary - APEX Business Systems Ltd.
---

# apex-universal-sync-orchestrator

**Input**: External application JSON payload file path + mapping schema file path
**Output**: Normalized APEX-OmniHub state vector printed to stdout as JSON
**Success**: Exit code 0 with normalized JSON on stdout, `omni_id` field present
**Fails when**: Payload missing required fields (`source_system`, `sync_timestamp`, `data_payload`), mapping schema is invalid JSON, or field type coercions fail

## Workflow

Load and validate the mapping schema first. If the schema is malformed, exit immediately — there is no safe default mapping.

```
mapping schema parses as valid JSON?
+- yes -> validate payload against required fields
+- no  -> exit 1 with "SCHEMA ERROR: <parse message>"

payload has source_system, sync_timestamp, data_payload?
+- yes -> apply field mappings, generate omni_id, output normalized vector
+- no  -> exit 1 with "PAYLOAD ERROR: missing field <name>"
```

For each mapped field: coerce types per schema rules, apply any transform
expressions, then assemble the output vector. Collect all mapping violations
before reporting — a full report saves the user a re-run cycle.

Generate `omni_id` as `{source_system}_{sync_timestamp_epoch}` to ensure
deterministic deduplication across re-sync attempts.

## Verification

Run this before declaring done - an unchecked output is an unverified claim:

```bash
python3 scripts/sync_payload.py sample_payload.json mapping_schema.json && echo SYNC_OK
```

## Failure handling

If `data_payload` is present but empty (`{}`), emit a warning line and continue
rather than exiting — an empty payload is a valid initial state for a new app
integration. If a mapped field is missing from the payload but the schema marks
it `optional`, substitute the schema default value instead of failing.

## References

- `references/payload-mapping-schema.md` - read when the user asks what the mapping schema file should look like or how to define field transforms
