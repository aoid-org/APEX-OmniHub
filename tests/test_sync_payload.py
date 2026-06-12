"""
Tests for scripts/sync_payload.py — universal sync payload normalizer.
Covers all branches: coercions, optional fields, violations, omni_id,
schema errors, payload errors, empty data_payload, and main() CLI flow.
"""
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

# Allow importing the script directly from the scripts/ directory.
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
import sync_payload as sp  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

VALID_SCHEMA = {
    "field_mappings": {
        "name":   {"source_field": "contact_name", "type": "string"},
        "value":  {"source_field": "deal_value",   "type": "integer"},
        "active": {"source_field": "is_active",    "type": "boolean"},
        "score":  {"source_field": "score",        "type": "float"},
        "region": {"source_field": "region",       "type": "string",
                   "optional": True, "default": "UNKNOWN"},
    }
}

VALID_PAYLOAD = {
    "source_system": "salesforce",
    "sync_timestamp": "2026-06-10T09:00:00Z",
    "data_payload": {
        "contact_name": "Jane Smith",
        "deal_value": "42500",
        "is_active": "true",
        "score": "9.7",
    },
}


def _write_json(data: dict) -> str:
    f = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False)
    json.dump(data, f)
    f.close()
    return f.name


# ---------------------------------------------------------------------------
# coerce_value
# ---------------------------------------------------------------------------

class TestCoerceValue:
    def test_string(self):
        assert sp.coerce_value(42, "string") == "42"

    def test_integer(self):
        assert sp.coerce_value("100", "integer") == 100

    def test_integer_raises_on_non_numeric(self):
        with pytest.raises((ValueError, TypeError)):
            sp.coerce_value("abc", "integer")

    def test_float(self):
        assert sp.coerce_value("3.14", "float") == pytest.approx(3.14)

    def test_float_raises_on_non_numeric(self):
        with pytest.raises((ValueError, TypeError)):
            sp.coerce_value("abc", "float")

    def test_boolean_true_variants(self):
        for v in ("true", "1", "yes", "TRUE", "Yes"):
            assert sp.coerce_value(v, "boolean") is True

    def test_boolean_false(self):
        assert sp.coerce_value("false", "boolean") is False
        assert sp.coerce_value("no", "boolean") is False
        assert sp.coerce_value("0", "boolean") is False

    def test_boolean_passthrough_if_already_bool(self):
        assert sp.coerce_value(True, "boolean") is True
        assert sp.coerce_value(False, "boolean") is False

    def test_unknown_type_passthrough(self):
        assert sp.coerce_value("raw", "uuid") == "raw"


# ---------------------------------------------------------------------------
# extract_epoch_digits
# ---------------------------------------------------------------------------

class TestExtractEpochDigits:
    def test_iso_timestamp(self):
        assert sp.extract_epoch_digits("2026-06-10T09:00:00Z") == "2026061009"

    def test_already_digits(self):
        assert sp.extract_epoch_digits("20260610090000") == "2026061009"

    def test_short_timestamp(self):
        result = sp.extract_epoch_digits("2026")
        assert result == "2026"


# ---------------------------------------------------------------------------
# validate_schema
# ---------------------------------------------------------------------------

class TestValidateSchema:
    def test_valid_schema(self):
        fm = sp.validate_schema(VALID_SCHEMA)
        assert "name" in fm

    def test_missing_field_mappings_exits(self):
        with pytest.raises(SystemExit) as exc:
            sp.validate_schema({})
        assert exc.value.code == 1

    def test_non_dict_field_mappings_exits(self):
        with pytest.raises(SystemExit) as exc:
            sp.validate_schema({"field_mappings": ["a", "b"]})
        assert exc.value.code == 1


# ---------------------------------------------------------------------------
# validate_payload
# ---------------------------------------------------------------------------

class TestValidatePayload:
    def test_valid_payload(self):
        ss, ts, dp = sp.validate_payload(VALID_PAYLOAD)
        assert ss == "salesforce"
        assert ts == "2026-06-10T09:00:00Z"
        assert "contact_name" in dp

    def test_missing_source_system_exits(self):
        bad = {k: v for k, v in VALID_PAYLOAD.items() if k != "source_system"}
        with pytest.raises(SystemExit) as exc:
            sp.validate_payload(bad)
        assert exc.value.code == 1

    def test_missing_sync_timestamp_exits(self):
        bad = {k: v for k, v in VALID_PAYLOAD.items() if k != "sync_timestamp"}
        with pytest.raises(SystemExit) as exc:
            sp.validate_payload(bad)
        assert exc.value.code == 1

    def test_missing_data_payload_exits(self):
        bad = {k: v for k, v in VALID_PAYLOAD.items() if k != "data_payload"}
        with pytest.raises(SystemExit) as exc:
            sp.validate_payload(bad)
        assert exc.value.code == 1

    def test_all_fields_missing_exits(self):
        with pytest.raises(SystemExit) as exc:
            sp.validate_payload({})
        assert exc.value.code == 1


# ---------------------------------------------------------------------------
# apply_mappings
# ---------------------------------------------------------------------------

class TestApplyMappings:
    def test_happy_path(self):
        result, violations = sp.apply_mappings(
            VALID_PAYLOAD["data_payload"],
            VALID_SCHEMA["field_mappings"],
        )
        assert result["name"] == "Jane Smith"
        assert result["value"] == 42500
        assert result["active"] is True
        assert result["score"] == pytest.approx(9.7)
        assert result["region"] == "UNKNOWN"  # optional default
        assert violations == []

    def test_optional_field_present_overrides_default(self):
        data = dict(VALID_PAYLOAD["data_payload"], region="EU-WEST")
        result, violations = sp.apply_mappings(data, VALID_SCHEMA["field_mappings"])
        assert result["region"] == "EU-WEST"
        assert violations == []

    def test_required_field_missing_produces_violation(self):
        _, violations = sp.apply_mappings({}, VALID_SCHEMA["field_mappings"])
        assert any("name" in v for v in violations)
        assert any("value" in v for v in violations)

    def test_coercion_failure_produces_violation(self):
        data = dict(VALID_PAYLOAD["data_payload"], deal_value="not-a-number")
        _, violations = sp.apply_mappings(data, VALID_SCHEMA["field_mappings"])
        assert any("value" in v and "coercion" in v for v in violations)

    def test_source_field_defaults_to_target_field_name(self):
        schema = {"field_mappings": {"deal_value": {"type": "integer"}}}
        result, violations = sp.apply_mappings({"deal_value": "500"}, schema["field_mappings"])
        assert result["deal_value"] == 500
        assert violations == []

    def test_empty_data_payload_all_violations(self):
        _, violations = sp.apply_mappings({}, VALID_SCHEMA["field_mappings"])
        required_fields = [k for k, v in VALID_SCHEMA["field_mappings"].items()
                           if not v.get("optional")]
        assert len(violations) == len(required_fields)

    def test_optional_null_default(self):
        schema = {"target": {"source_field": "missing", "type": "string",
                              "optional": True, "default": None}}
        result, violations = sp.apply_mappings({}, schema)
        assert result["target"] is None
        assert violations == []


# ---------------------------------------------------------------------------
# load_json_file
# ---------------------------------------------------------------------------

class TestLoadJsonFile:
    def test_loads_valid_file(self):
        path = _write_json({"key": "val"})
        data = sp.load_json_file(path, "TEST")
        assert data["key"] == "val"

    def test_missing_file_exits(self):
        with pytest.raises(SystemExit) as exc:
            sp.load_json_file("/nonexistent/path.json", "TEST")
        assert exc.value.code == 1

    def test_invalid_json_exits(self, tmp_path):
        bad = tmp_path / "bad.json"
        bad.write_text("not json")
        with pytest.raises(SystemExit) as exc:
            sp.load_json_file(str(bad), "TEST")
        assert exc.value.code == 1


# ---------------------------------------------------------------------------
# main() integration — uses subprocess-style argv patching
# ---------------------------------------------------------------------------

class TestMain:
    def _run(self, payload: dict, schema: dict) -> tuple[int, str]:
        p_path = _write_json(payload)
        s_path = _write_json(schema)
        captured = []
        with patch("sys.argv", ["sync_payload.py", p_path, s_path]):
            with patch("builtins.print", side_effect=lambda *a, **kw: captured.append(str(a[0]) if a else "")):
                try:
                    sp.main()
                    code = 0
                except SystemExit as e:
                    code = e.code
        Path(p_path).unlink(missing_ok=True)
        Path(s_path).unlink(missing_ok=True)
        return code, "\n".join(captured)

    def test_happy_path_exit_0(self):
        code, out = self._run(VALID_PAYLOAD, VALID_SCHEMA)
        assert code == 0
        assert "salesforce_2026061009" in out

    def test_omni_id_in_output(self):
        code, out = self._run(VALID_PAYLOAD, VALID_SCHEMA)
        assert code == 0
        parsed = json.loads(out)
        assert parsed["omni_id"] == "salesforce_2026061009"
        assert parsed["meta"]["fields_mapped"] == 5

    def test_violations_exit_1(self):
        payload = dict(VALID_PAYLOAD, data_payload={})
        code, out = self._run(payload, VALID_SCHEMA)
        assert code == 1
        assert "required field missing" in out

    def test_bad_schema_exit_1(self):
        code, out = self._run(VALID_PAYLOAD, {"no_mappings": {}})
        assert code == 1

    def test_missing_payload_fields_exit_1(self):
        code, _ = self._run({"source_system": "x"}, VALID_SCHEMA)
        assert code == 1

    def test_empty_data_payload_warns_and_exits_0(self):
        payload = {"source_system": "hubspot", "sync_timestamp": "2026-06-11T12:00:00Z",
                   "data_payload": {}}
        code, out = self._run(payload, {"field_mappings": {}})
        assert code == 0

    def test_wrong_arg_count_exits(self):
        with patch("sys.argv", ["sync_payload.py"]):
            with pytest.raises(SystemExit) as exc:
                sp.main()
            assert exc.value.code == 1
