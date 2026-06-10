#!/usr/bin/env python3
"""Normalize external application JSON payloads into APEX-OmniHub state vectors.

Usage: sync_payload.py <input_json_path> <mapping_schema_path>

Exit 0: normalized JSON written to stdout, omni_id present.
Exit 1: one violation line per failure in format FIELD_NAME: reason.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REQUIRED_PAYLOAD_FIELDS = ("source_system", "sync_timestamp", "data_payload")
SUPPORTED_TYPE_COERCIONS = ("string", "integer", "float", "boolean")


def _load_json(path: str, label: str) -> dict:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"{label.upper()} ERROR: file not found: {path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print(f"{label.upper()} ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


def _coerce(value: object, target_type: str, field: str) -> tuple[object, str | None]:
    """Return (coerced_value, error_message_or_None)."""
    try:
        if target_type == "string":
            return str(value), None
        if target_type == "integer":
            return int(value), None
        if target_type == "float":
            return float(value), None
        if target_type == "boolean":
            if isinstance(value, bool):
                return value, None
            if str(value).lower() in ("true", "1", "yes"):
                return True, None
            if str(value).lower() in ("false", "0", "no"):
                return False, None
            return None, f"{field}: cannot coerce {value!r} to boolean"
    except (ValueError, TypeError):
        return None, f"{field}: cannot coerce {value!r} to {target_type}"
    return value, None


def _generate_omni_id(source_system: str, sync_timestamp: str) -> str:
    """Deterministic ID for deduplication across re-sync attempts."""
    import re
    epoch_digits = re.sub(r"[^0-9]", "", str(sync_timestamp))[:13]
    clean_source = re.sub(r"[^a-zA-Z0-9_]", "_", str(source_system)).lower()
    return f"{clean_source}_{epoch_digits}"


def validate_schema(schema: dict) -> list[str]:
    errors = []
    if not isinstance(schema.get("field_mappings"), dict):
        errors.append("SCHEMA ERROR: 'field_mappings' must be a dict")
    return errors


def normalize_payload(payload: dict, schema: dict) -> tuple[dict | None, list[str]]:
    """Apply schema mappings to payload. Returns (result, violations)."""
    violations: list[str] = []

    # Check required top-level fields
    for field in REQUIRED_PAYLOAD_FIELDS:
        if field not in payload:
            violations.append(f"PAYLOAD ERROR: missing required field '{field}'")

    if violations:
        return None, violations

    data = payload.get("data_payload", {})
    if not data:
        print("WARNING: data_payload is empty — proceeding with empty initial state",
              file=sys.stderr)

    mappings: dict = schema.get("field_mappings", {})
    output: dict = {}

    for target_field, rule in mappings.items():
        source_field = rule.get("source_field", target_field)
        target_type = rule.get("type", "string")
        optional = rule.get("optional", False)
        default = rule.get("default")

        if source_field not in data:
            if optional:
                output[target_field] = default
                continue
            violations.append(f"{source_field}: required field missing from data_payload")
            continue

        raw_value = data[source_field]

        if target_type not in SUPPORTED_TYPE_COERCIONS:
            violations.append(f"{target_field}: unsupported type '{target_type}'")
            continue

        coerced, err = _coerce(raw_value, target_type, target_field)
        if err:
            violations.append(err)
        else:
            output[target_field] = coerced

    if violations:
        return None, violations

    result = {
        "omni_id": _generate_omni_id(payload["source_system"], payload["sync_timestamp"]),
        "source_system": str(payload["source_system"]),
        "sync_timestamp": str(payload["sync_timestamp"]),
        "schema_version": str(schema.get("schema_version", "1.0")),
        "data": output,
        "meta": {
            "origin": "apex-universal-sync-orchestrator",
            "fields_mapped": len(output),
        },
    }
    return result, []


def main() -> int:
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input_json_path> <mapping_schema_path>",
              file=sys.stderr)
        return 2

    schema = _load_json(sys.argv[2], "schema")
    schema_errors = validate_schema(schema)
    if schema_errors:
        for err in schema_errors:
            print(err)
        return 1

    payload = _load_json(sys.argv[1], "payload")
    result, violations = normalize_payload(payload, schema)

    if violations:
        for v in violations:
            print(v)
        return 1

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
