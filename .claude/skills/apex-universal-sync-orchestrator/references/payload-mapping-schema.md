---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Payload Mapping Schema Reference

## Contents

1. Required Payload Fields
2. field_mappings Structure
3. Supported Type Coercions
4. Optional Field Behavior
5. omni_id Generation Rules

---

## Required Payload Fields

Every external application payload submitted to the sync engine must include three
top-level fields. Absence of any of these causes an immediate exit 1.

| Field | Type | Description |
|-------|------|-------------|
| `source_system` | string | Identifier for the originating application (e.g., `salesforce`, `hubspot`) |
| `sync_timestamp` | string | ISO 8601 timestamp of the sync event (e.g., `2026-06-10T09:00:00Z`) |
| `data_payload` | object | Key-value pairs from the source application; may be empty for initial sync states |

An empty `data_payload` is accepted with a warning — it represents a valid initial
integration state before data populates.

---

## field_mappings Structure

The mapping schema JSON must contain a top-level `field_mappings` key whose value is
a dict. Each entry maps a target APEX field name to a source specification:

```json
{
  "field_mappings": {
    "<target_field>": {
      "source_field": "<key in data_payload>",
      "type": "string | integer | float | boolean",
      "optional": true,
      "default": null
    }
  }
}
```

- `source_field`: The key to read from `data_payload`. Defaults to `target_field` if omitted.
- `type`: Required. Determines coercion applied to the raw string value.
- `optional`: Boolean. If `true` and `source_field` is absent, `default` is used.
- `default`: Any JSON value used when the field is optional and absent. May be `null`.

---

## Supported Type Coercions

| Type name | Behavior |
|-----------|----------|
| `string` | `str(value)` |
| `integer` | `int(value)` — raises on non-numeric |
| `float` | `float(value)` — raises on non-numeric |
| `boolean` | `true` if raw value (lowercased) is in `["true", "1", "yes"]`; else `false` |

Coercion failures are collected as violations and reported together before exit 1.
Unknown type names pass the raw value through unchanged.

---

## Optional Field Behavior

A field mapping marked `"optional": true` follows this logic:

1. If `source_field` is present in `data_payload`: coerce and use the value normally.
2. If `source_field` is absent: use the `default` value from the schema spec.

No violation is recorded for an absent optional field. The default value may be
`null`, a string, a number, or any valid JSON primitive.

---

## omni_id Generation Rules

`omni_id` is generated as: `{source_system}_{epoch_digits}`

- `source_system`: taken directly from the payload's `source_system` field.
- `epoch_digits`: all non-digit characters are stripped from `sync_timestamp`; the
  first 10 resulting digits are used (equivalent to Unix epoch seconds for standard
  ISO timestamps).

**Example:**
```
source_system:  "salesforce"
sync_timestamp: "2026-06-10T09:00:00Z"
epoch_digits:   "2026061009"
omni_id:        "salesforce_2026061009"
```

`omni_id` is deterministic for the same `(source_system, sync_timestamp)` pair,
making it safe for re-sync deduplication. It is appended to the output JSON after
all field mappings succeed.

---

_Revision note: v1.1.0 — OmniBoard dual-surface scoping correction applied 2026-06-11._
