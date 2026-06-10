#!/usr/bin/env python3
"""Normalize an external application JSON payload into an APEX-OmniHub state vector.

Usage:
    python3 sync_payload.py <input_json_path> <mapping_schema_path>

Exit codes:
    0 — payload normalized; state vector JSON on stdout.
    1 — schema, payload, or mapping violations; one reason per line on stderr.
    2 — usage error.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

REQUIRED_PAYLOAD_FIELDS = ("source_system", "sync_timestamp", "data_payload")
SUPPORTED_TYPES = ("string", "integer", "float", "boolean")
TRUE_LITERALS = {"true", "1", "yes", "y", "t"}
FALSE_LITERALS = {"false", "0", "no", "n", "f"}


def fail(lines: list[str]) -> None:
    """Print every violation line to stderr and exit 1."""
    for line in lines:
        print(line, file=sys.stderr)
    sys.exit(1)


def load_json(path: str, label: str) -> Any:
    """Load a JSON file; exit 1 with a labeled error on any I/O or parse failure."""
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail([f"{label} ERROR: file not found: {path}"])
    except json.JSONDecodeError as exc:
        fail([f"{label} ERROR: invalid JSON in {path}: {exc}"])
    return None  # unreachable — fail() exits


def validate_schema(schema: Any) -> dict[str, Any]:
    """Validate the mapping schema; return field_mappings or exit 1."""
    if not isinstance(schema, dict):
        fail(["SCHEMA ERROR: schema root must be a JSON object"])
    field_mappings = schema.get("field_mappings")
    if not isinstance(field_mappings, dict):
        fail(["SCHEMA ERROR: 'field_mappings' must be a dict"])
    return field_mappings


def validate_payload(payload: Any) -> list[str]:
    """Return one PAYLOAD ERROR line per missing required envelope field."""
    if not isinstance(payload, dict):
        return ["PAYLOAD ERROR: payload root must be a JSON object"]
    return [
        f"PAYLOAD ERROR: missing required field '{name}'"
        for name in REQUIRED_PAYLOAD_FIELDS
        if name not in payload
    ]


def coerce(value: Any, type_name: str) -> Any:
    """Coerce value to the declared schema type. Raises ValueError on failure."""
    if type_name == "string":
        return str(value)
    if type_name == "integer":
        if isinstance(value, bool):
            raise ValueError("boolean is not an integer")
        return int(value)
    if type_name == "float":
        if isinstance(value, bool):
            raise ValueError("boolean is not a float")
        return float(value)
    if type_name == "boolean":
        if isinstance(value, bool):
            return value
        literal = str(value).strip().lower()
        if literal in TRUE_LITERALS:
            return True
        if literal in FALSE_LITERALS:
            return False
        raise ValueError(f"'{value}' is not a recognized boolean literal")
    raise ValueError(f"unsupported type '{type_name}'")


def apply_mappings(
    data_payload: dict[str, Any], field_mappings: dict[str, Any]
) -> tuple[dict[str, Any], list[str]]:
    """Map every schema field, collecting all violations before reporting."""
    state_vector: dict[str, Any] = {}
    violations: list[str] = []

    for target_field, rule in field_mappings.items():
        if not isinstance(rule, dict):
            violations.append(f"{target_field}: mapping rule must be an object")
            continue

        source_field = rule.get("source_field")
        type_name = rule.get("type", "string")
        optional = bool(rule.get("optional", False))

        if not source_field:
            violations.append(f"{target_field}: mapping rule missing 'source_field'")
            continue
        if type_name not in SUPPORTED_TYPES:
            violations.append(f"{target_field}: unsupported type '{type_name}'")
            continue

        if source_field not in data_payload:
            if optional:
                state_vector[target_field] = rule.get("default")
                continue
            violations.append(f"{target_field}: required field missing from data_payload")
            continue

        try:
            state_vector[target_field] = coerce(data_payload[source_field], type_name)
        except (ValueError, TypeError):
            violations.append(
                f"{target_field}: cannot coerce {data_payload[source_field]!r} to {type_name}"
            )

    return state_vector, violations


def generate_omni_id(source_system: str, sync_timestamp: str) -> str:
    """Deterministic omni_id: {source_system}_{digits of sync_timestamp}.

    Re-syncing the same payload yields the same omni_id, which is what makes
    downstream deduplication safe.
    """
    epoch_digits = re.sub(r"\D", "", sync_timestamp)
    return f"{source_system}_{epoch_digits}"


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(
            "usage: sync_payload.py <input_json_path> <mapping_schema_path>",
            file=sys.stderr,
        )
        return 2

    # Schema validation always runs first — nothing maps against a bad schema.
    schema = load_json(argv[2], "SCHEMA")
    field_mappings = validate_schema(schema)

    payload = load_json(argv[1], "PAYLOAD")
    payload_errors = validate_payload(payload)
    if payload_errors:
        fail(payload_errors)

    source_system = str(payload["source_system"])
    sync_timestamp = str(payload["sync_timestamp"])
    data_payload = payload["data_payload"]

    if not isinstance(data_payload, dict):
        fail(["PAYLOAD ERROR: 'data_payload' must be a JSON object"])

    if len(data_payload) == 0:
        # An empty payload is a valid initial state for a new integration.
        print(
            "WARNING: data_payload is empty — emitting initial state vector "
            "with zero mapped fields",
            file=sys.stderr,
        )
        state_vector: dict[str, Any] = {}
        fields_mapped = 0
    else:
        state_vector, violations = apply_mappings(data_payload, field_mappings)
        if violations:
            fail(violations)
        fields_mapped = len(state_vector)

    normalized = {
        "omni_id": generate_omni_id(source_system, sync_timestamp),
        "source_system": source_system,
        "sync_timestamp": sync_timestamp,
        "state_vector": state_vector,
        "meta": {
            "schema_version": str(schema.get("schema_version", "unversioned")),
            "fields_mapped": fields_mapped,
        },
    }
    print(json.dumps(normalized, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
