#!/usr/bin/env python3
"""
apex-universal-sync-orchestrator v1.1.0: sync_payload.py
Normalizes external application JSON payloads into APEX-OmniHub state vectors.
Args: <input_json_path> <mapping_schema_path>
"""
import json
import re
import sys

# ---------------------------------------------------------------------------
# Type coercion helpers
# ---------------------------------------------------------------------------

def coerce_value(raw, type_name: str):
    """Apply type coercion per schema type field."""
    if type_name == "string":
        return str(raw)
    if type_name == "integer":
        return int(raw)
    if type_name == "float":
        return float(raw)
    if type_name == "boolean":
        if isinstance(raw, bool):
            return raw
        return str(raw).strip().lower() in ("true", "1", "yes")
    return raw  # unknown type — pass through unchanged


def extract_epoch_digits(timestamp: str) -> str:
    """Extract all digit characters from an ISO timestamp, take first 10."""
    return re.sub(r"\D", "", timestamp)[:10]


# ---------------------------------------------------------------------------
# JSON I/O helpers
# ---------------------------------------------------------------------------

def load_json_file(path: str, label: str) -> dict:
    """Load and parse a JSON file; exit 1 on any failure."""
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        print(f"{label} ERROR: file not found — {path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print(f"{label} ERROR: invalid JSON — {exc}", file=sys.stderr)
        sys.exit(1)
    except OSError as exc:
        print(f"{label} ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def validate_schema(schema: dict) -> dict:
    """Validate schema structure; exit 1 with SCHEMA ERROR on failure."""
    field_mappings = schema.get("field_mappings")
    if not isinstance(field_mappings, dict):
        print("SCHEMA ERROR: 'field_mappings' must be a dict")
        sys.exit(1)
    return field_mappings


def validate_payload(payload: dict) -> tuple:
    """Validate required top-level payload fields; exit 1 listing all missing."""
    required = ("source_system", "sync_timestamp", "data_payload")
    errors = [
        f"PAYLOAD ERROR: missing required field '{f}'"
        for f in required
        if f not in payload
    ]
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    return payload["source_system"], payload["sync_timestamp"], payload["data_payload"]


# ---------------------------------------------------------------------------
# Mapping engine
# ---------------------------------------------------------------------------

def apply_mappings(data_payload: dict, field_mappings: dict) -> tuple:
    """
    Apply field mappings with type coercions.
    Returns (result_dict, violations_list).
    Collects all violations — never stops at first error.
    """
    result = {}
    violations = []

    for target_field, spec in field_mappings.items():
        source_field = spec.get("source_field", target_field)
        type_name = spec.get("type", "string")
        optional = spec.get("optional", False)
        default = spec.get("default", None)

        if source_field in data_payload:
            try:
                result[target_field] = coerce_value(data_payload[source_field], type_name)
            except (ValueError, TypeError) as exc:
                violations.append(
                    f"{target_field}: coercion to {type_name} failed — {exc}"
                )
        elif optional:
            result[target_field] = default
        else:
            violations.append(
                f"{target_field}: required field missing from data_payload"
            )

    return result, violations


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) != 3:
        print(
            "Usage: sync_payload.py <input_json_path> <mapping_schema_path>",
            file=sys.stderr,
        )
        sys.exit(1)

    payload_path, schema_path = sys.argv[1], sys.argv[2]

    # 1. Load and validate schema
    schema = load_json_file(schema_path, "SCHEMA")
    field_mappings = validate_schema(schema)

    # 2. Load and validate payload
    payload = load_json_file(payload_path, "PAYLOAD")
    source_system, sync_timestamp, data_payload = validate_payload(payload)

    # 3. Warn on empty data_payload — valid initial state, not an error
    if not data_payload:
        print("WARNING: data_payload is empty — no fields to map", file=sys.stderr)

    # 4. Apply field mappings with full violation collection
    result, violations = apply_mappings(data_payload, field_mappings)

    if violations:
        print("\n".join(violations))
        sys.exit(1)

    # 5. Generate deterministic omni_id for deduplication safety
    epoch_digits = extract_epoch_digits(sync_timestamp)
    omni_id = f"{source_system}_{epoch_digits}"
    result["omni_id"] = omni_id

    # 6. Attach metadata
    result["meta"] = {
        "source_system": source_system,
        "sync_timestamp": sync_timestamp,
        "fields_mapped": len(field_mappings),
    }

    print(json.dumps(result, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
