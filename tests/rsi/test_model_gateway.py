"""Tests for tools/rsi/model_gateway.py (upgraded from proposal-stage stub)."""

from __future__ import annotations

import json
import sys
import urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parents[2]))

from tools.rsi.model_gateway import (
    _build_request_payload,
    _call_model,
    _validate_model_response,
    run_model_gateway,
)

VALID_MODEL_RESPONSE = {
    "model_decision": "allow",
    "confidence": "high",
    "risk_assessment": "low",
    "rationale": "No concerns found in this PR.",
    "additional_tests": [],
    "additional_reviewers": [],
}

SAMPLE_EVIDENCE = {
    "changed_paths": ["src/app.ts"],
    "classified_paths": {"src/app.ts": "standard"},
    "diff_stats": {"total_files_changed": 1},
    "candidate_test_plan": ["frontend-unit-tests"],
    "repository": {"name": "repo", "pr_number": 1},
}

SAMPLE_POLICY = {
    "decision": "escalate",
    "critical_path_hits": [],
    "protected_path_hits": [],
    "rationale": "critical path",
    "model_usage_allowed": True,
}


def _make_http_resp(body: str, status: int = 200):
    mock = MagicMock()
    mock.__enter__ = lambda s: s
    mock.__exit__ = MagicMock(return_value=False)
    mock.read.return_value = body.encode("utf-8")
    mock.status = status
    return mock


def test_disabled_when_model_env_absent(tmp_artifacts_dir, monkeypatch):
    """No HTTP call when RSI_MODEL_ENABLED is empty."""
    monkeypatch.delenv("RSI_MODEL_ENABLED", raising=False)
    # Write required artifact files
    (tmp_artifacts_dir / "evidence.json").write_text(json.dumps(SAMPLE_EVIDENCE))
    (tmp_artifacts_dir / "policy_result.json").write_text(json.dumps(SAMPLE_POLICY))

    with patch("tools.rsi.model_gateway.ARTIFACT_DIR", tmp_artifacts_dir), \
         patch("urllib.request.urlopen") as mock_http:
        rc = run_model_gateway()

    mock_http.assert_not_called()
    assert rc == 0


def test_valid_response_parsed(tmp_artifacts_dir, monkeypatch):
    monkeypatch.setenv("RSI_MODEL_ENABLED", "true")
    monkeypatch.setenv("RSI_MODEL_ENDPOINT", "https://api.example.com/v1/chat/completions")
    monkeypatch.setenv("RSI_MODEL_API_KEY", "sk-test")
    (tmp_artifacts_dir / "evidence.json").write_text(json.dumps(SAMPLE_EVIDENCE))
    policy = {**SAMPLE_POLICY, "model_usage_allowed": True}
    (tmp_artifacts_dir / "policy_result.json").write_text(json.dumps(policy))

    outer = {"choices": [{"message": {"content": json.dumps(VALID_MODEL_RESPONSE)}}]}
    resp = _make_http_resp(json.dumps(outer))

    with patch("tools.rsi.model_gateway.ARTIFACT_DIR", tmp_artifacts_dir), \
         patch("urllib.request.urlopen", return_value=resp):
        rc = run_model_gateway()

    assert rc == 0
    result = json.loads((tmp_artifacts_dir / "model_result.json").read_text())
    assert result["model_available"] is True
    assert result["model_decision"] == "allow"
    assert result["confidence"] == "high"


def test_malformed_json_fail_closed(tmp_artifacts_dir, monkeypatch):
    """Invalid JSON response → INVALID_JSON error state written, pipeline continues."""
    monkeypatch.setenv("RSI_MODEL_ENABLED", "true")
    monkeypatch.setenv("RSI_MODEL_ENDPOINT", "https://api.example.com/v1/chat/completions")
    monkeypatch.setenv("RSI_MODEL_API_KEY", "sk-test")
    (tmp_artifacts_dir / "evidence.json").write_text(json.dumps(SAMPLE_EVIDENCE))
    (tmp_artifacts_dir / "policy_result.json").write_text(json.dumps(SAMPLE_POLICY))

    resp = _make_http_resp("not json at all {{{{")

    with patch("tools.rsi.model_gateway.ARTIFACT_DIR", tmp_artifacts_dir), \
         patch("urllib.request.urlopen", return_value=resp):
        rc = run_model_gateway()

    assert rc == 0
    result = json.loads((tmp_artifacts_dir / "model_result.json").read_text())
    assert result["model_available"] is False
    assert result["error"] == "INVALID_JSON"


def test_timeout_fail_closed():
    """TimeoutError → TIMEOUT error state returned."""
    with patch("urllib.request.urlopen", side_effect=TimeoutError("timed out")):
        result = _call_model("https://api.example.com", "sk-key", {})
    assert result["model_available"] is False
    assert result["error"] == "TIMEOUT"


def test_401_fail_closed():
    """HTTP 401 → AUTH_FAILURE error state."""
    exc = urllib.error.HTTPError(
        url="https://api.example.com", code=401, msg="Unauthorized", hdrs=None, fp=None
    )
    with patch("urllib.request.urlopen", side_effect=exc):
        result = _call_model("https://api.example.com", "sk-key", {})
    assert result["model_available"] is False
    assert result["error"] == "AUTH_FAILURE"


def test_missing_required_field_rejected():
    """Model response missing 'confidence' field → SCHEMA_INVALID."""
    incomplete = {k: v for k, v in VALID_MODEL_RESPONSE.items() if k != "confidence"}
    error = _validate_model_response(incomplete)
    assert error == "SCHEMA_INVALID"


def test_model_cannot_return_block():
    """model_decision == 'block' is not in MODEL_DECISION_ALLOWED → SCHEMA_INVALID."""
    bad_response = {**VALID_MODEL_RESPONSE, "model_decision": "block"}
    error = _validate_model_response(bad_response)
    assert error == "SCHEMA_INVALID"


def test_evidence_not_sent_in_full():
    """Request payload must not contain full diff or raw source tree."""
    evidence = {
        **SAMPLE_EVIDENCE,
        "scoped_diff_summary": "large diff content here",
        "inventory_summary": "lots of inventory data",
    }
    payload = _build_request_payload(evidence, SAMPLE_POLICY)
    payload_str = json.dumps(payload)
    assert "scoped_diff_summary" not in payload_str
    assert "inventory_summary" not in payload_str
