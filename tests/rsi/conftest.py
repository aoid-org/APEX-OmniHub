"""Shared fixtures for RSI test suite."""

from __future__ import annotations

import json
from collections.abc import Generator
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

SAMPLE_EVIDENCE: dict[str, Any] = {
    "schema_version": "1.0.0",
    "generated_at": "2026-05-15T00:00:00+00:00",
    "generation_mode": "ci",
    "policy_version": "1.3.0",
    "repository": {
        "name": "APEX-OmniHub",
        "sha": "abc123def456abc123def456abc123def456abc123",
        "pr_number": 42,
        "base_ref": "main",
        "head_ref": "feature/rsi-tests",
    },
    "changed_paths": ["src/components/Button.tsx", "docs/rsi/README.md"],
    "classified_paths": {
        "src/components/Button.tsx": "standard",
        "docs/rsi/README.md": "docs-only",
    },
    "protected_path_hits": [],
    "diff_stats": {
        "total_files_changed": 2,
        "insertions": 15,
        "deletions": 3,
    },
    "scoped_diff_summary": "src/components/Button.tsx | 18 +++++++--\n docs/rsi/README.md | 5 +++",
    "inventory_summary": "repo=APEX-OmniHub\ngenerated_at=2026-05-15T00:00:00Z",
    "manifests_touched": [],
    "workflows_touched": [],
    "candidate_test_plan": ["frontend-unit-tests", "e2e-smoke"],
}

SAMPLE_POLICY_RESULT: dict[str, Any] = {
    "decision": "allow",
    "protected_path_hits": [],
    "critical_path_hits": [],
    "required_tests": ["frontend-unit-tests"],
    "recommended_reviewers": [],
    "model_usage_allowed": False,
    "rationale": "No protected or critical paths touched.",
    "policy_version": "1.3.0",
    "checked_at": "2026-05-15T00:00:00+00:00",
}


@pytest.fixture()
def sample_evidence_bundle() -> dict[str, Any]:
    """Return a realistic evidence bundle dict."""
    return dict(SAMPLE_EVIDENCE)


@pytest.fixture()
def sample_policy_result() -> dict[str, Any]:
    """Return a realistic policy result dict."""
    return dict(SAMPLE_POLICY_RESULT)


@pytest.fixture()
def mock_subprocess_run():
    """Patch subprocess.run to return configurable fake output."""
    fake = MagicMock()
    fake.returncode = 0
    fake.stdout = "file1.py\nfile2.ts\n"
    fake.stderr = ""
    with patch("subprocess.run", return_value=fake) as mock:
        yield mock


@pytest.fixture()
def mock_http_session():
    """Patch urllib.request.urlopen to return configurable HTTP responses."""
    mock_resp = MagicMock()
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)
    mock_resp.read.return_value = json.dumps({
        "choices": [{
            "message": {
                "content": json.dumps({
                    "model_decision": "allow",
                    "confidence": "high",
                    "risk_assessment": "low",
                    "rationale": "No concerns.",
                    "additional_tests": [],
                    "additional_reviewers": [],
                })
            }
        }]
    }).encode("utf-8")
    with patch("urllib.request.urlopen", return_value=mock_resp) as mock:
        yield mock


@pytest.fixture()
def tmp_artifacts_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[Path, None, None]:
    """Create temp artifact dir and set RSI_ARTIFACT_DIR env var."""
    artifact_dir = tmp_path / "artifacts" / "rsi"
    artifact_dir.mkdir(parents=True)
    monkeypatch.setenv("RSI_ARTIFACT_DIR", str(artifact_dir))
    yield artifact_dir
