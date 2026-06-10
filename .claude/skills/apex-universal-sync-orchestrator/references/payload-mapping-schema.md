# Payload Mapping Schema Reference

How `scripts/sync_payload.py` interprets payloads and mapping schemas.

## Required payload fields

Every inbound payload must be a JSON object with all three envelope fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `source_system` | string | Identifier of the external application (e.g. `salesforce`). |
| `sync_timestamp` | string | ISO-8601 timestamp of the sync event. |
| `data_payload` | object | The raw external fields to normalize. May be empty for a brand-new integration. |

A missing envelope field produces `PAYLOAD ERROR: missing required field '<name>'`
on stderr and exit code 1. All missing fields are reported in one pass.

## field_mappings structure

The mapping schema is a JSON object whose `field_mappings` key maps each
target OmniHub field to a rule object:

```json
{
  "schema_version": "1.0",
  "source_system": "salesforce",
  "field_mappings": {
    "account_name":   { "source_field": "AccountName",  "type": "string" },
    "annual_revenue": { "source_field": "AnnualRevenue", "type": "float" },
    "notes":          { "source_field": "Notes", "type": "string", "optional": true, "default": null }
  }
}
```

If `field_mappings` is missing or is not a dict, the run stops immediately
with `SCHEMA ERROR: 'field_mappings' must be a dict` — schema validation
always precedes payload processing.

## Supported type coercions

| `type` | Coercion behavior |
| --- | --- |
| `string` | `str(value)` |
| `integer` | `int(value)`; booleans rejected |
| `float` | `float(value)`; booleans rejected (`"4200000"` → `4200000.0`) |
| `boolean` | native booleans pass through; the literals `true/false`, `1/0`, `yes/no`, `y/n`, `t/f` (case-insensitive) are coerced |

A value that cannot be coerced produces a
`FIELD_NAME: cannot coerce <value> to <type>` violation. Violations are
collected across all fields before reporting, never short-circuited.

## Optional field behavior

A rule with `"optional": true` whose `source_field` is absent from
`data_payload` resolves to the rule's `default` value (or `null` when no
default is declared). No violation is raised. A required field absent from
`data_payload` produces `FIELD_NAME: required field missing from data_payload`.

## omni_id generation rules

```text
omni_id = "{source_system}_{epoch_digits}"
epoch_digits = all digit characters of sync_timestamp, in order
```

Example: `source_system = "salesforce"` with
`sync_timestamp = "2026-06-10T09:00:00Z"` yields
`salesforce_20260610090000`. The value is fully deterministic — re-syncing
the same payload yields the same `omni_id`, which makes downstream
deduplication in the OmniBoard application integration layer safe.
