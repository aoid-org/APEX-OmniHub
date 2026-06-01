"""Tests for tools/rsi/policy_engine.py."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parents[2]))

from tools.rsi.policy_engine import PolicyEngine, run_policy_engine

MINIMAL_POLICY = (
    "policy_version: 1.3.0\n"
    "protected_paths:\n  - .github/workflows/**\n"
    "critical_paths:\n  - orchestrator/workflows/**\n"
    "max_files_without_escalation: 50\n"
)

DOCS_EVIDENCE: dict = {
    "changed_paths": ["docs/rsi/README.md", "CHANGELOG.md"],
    "candidate_test_plan": [],
}

PROTECTED_EVIDENCE: dict = {
    "changed_paths": [".github/workflows/ci.yml", "src/app.ts"],
    "candidate_test_plan": [],
}

CRITICAL_EVIDENCE: dict = {
    "changed_paths": ["orchestrator/workflows/release.py"],
    "candidate_test_plan": [],
}

STANDARD_EVIDENCE: dict = {
    "changed_paths": ["src/components/Button.tsx"],
    "candidate_test_plan": ["frontend-unit-tests"],
}


def _write_policy(tmp_path: Path, content: str = MINIMAL_POLICY) -> Path:
    policy_file = tmp_path / "rsi-policy.yaml"
    policy_file.write_text(content)
    return policy_file


def test_policy_loads_valid_yaml(tmp_path):
    policy_file = _write_policy(tmp_path)
    engine = PolicyEngine(policy_path=policy_file)
    result = engine.evaluate(STANDARD_EVIDENCE)
    assert result["decision"] in ("allow", "escalate", "block")
    assert "policy_version" in result
    assert result["policy_version"] == "1.3.0"


def test_policy_missing_file_raises(tmp_path):
    missing = tmp_path / "nonexistent.yaml"
    with pytest.raises(FileNotFoundError, match="policy file not found"):
        PolicyEngine(policy_path=missing)


def test_policy_invalid_yaml_raises(tmp_path):
    bad_file = tmp_path / "bad.yaml"
    bad_file.write_text("key: [unclosed\n  - item")
    with pytest.raises(ValueError, match="not valid YAML"):
        PolicyEngine(policy_path=bad_file)


def test_protected_path_blocks(tmp_path):
    policy_file = _write_policy(tmp_path)
    engine = PolicyEngine(policy_path=policy_file)
    result = engine.evaluate(PROTECTED_EVIDENCE)
    assert result["decision"] == "block"
    assert ".github/workflows/ci.yml" in result["protected_path_hits"]


def test_critical_path_escalates(tmp_path):
    policy_file = _write_policy(tmp_path)
    engine = PolicyEngine(policy_path=policy_file)
    result = engine.evaluate(CRITICAL_EVIDENCE)
    assert result["decision"] == "escalate"
    assert "orchestrator/workflows/release.py" in result["critical_path_hits"]


def test_docs_only_allows(tmp_path):
    policy_file = _write_policy(tmp_path)
    engine = PolicyEngine(policy_path=policy_file)
    result = engine.evaluate(DOCS_EVIDENCE)
    assert result["decision"] == "allow"


def test_model_usage_blocked_on_protected_paths(tmp_path, monkeypatch):
    monkeypatch.setenv("RSI_MODEL_ENABLED", "true")
    policy_file = _write_policy(tmp_path)
    engine = PolicyEngine(policy_path=policy_file)
    result = engine.evaluate(PROTECTED_EVIDENCE)
    assert result["model_usage_allowed"] is False


def test_model_usage_allowed_on_escalate(tmp_path, monkeypatch):
    monkeypatch.setenv("RSI_MODEL_ENABLED", "true")
    policy_file = _write_policy(tmp_path)
    engine = PolicyEngine(policy_path=policy_file)
    result = engine.evaluate(CRITICAL_EVIDENCE)
    assert result["decision"] == "escalate"
    assert result["model_usage_allowed"] is True


def test_max_files_escalation(tmp_path):
    policy_file = _write_policy(tmp_path, MINIMAL_POLICY + "max_files_without_escalation: 3\n")
    engine = PolicyEngine(policy_path=policy_file)
    large_changeset = {
        "changed_paths": [f"src/file{i}.ts" for i in range(10)],
        "candidate_test_plan": [],
    }
    result = engine.evaluate(large_changeset)
    assert result["decision"] == "escalate"
    assert "escalation threshold" in result["rationale"]


def test_output_file_written(tmp_artifacts_dir, tmp_path):
    """policy_result.json must be written to artifact dir."""
    policy_file = _write_policy(tmp_path)
    evidence_path = tmp_artifacts_dir / "evidence.json"
    evidence_path.write_text(json.dumps(STANDARD_EVIDENCE))

    with patch("tools.rsi.policy_engine.POLICY_FILE", policy_file), \
         patch("tools.rsi.policy_engine.ARTIFACT_DIR", tmp_artifacts_dir):
        rc = run_policy_engine()

    assert rc == 0
    out = tmp_artifacts_dir / "policy_result.json"
    assert out.exists()
    data = json.loads(out.read_text())
    assert "decision" in data



def test_repository_policy_escalates_rsi_gate_mutation():
    """Checked-in policy must route RSI gate edits to human review without self-deadlocking."""
    repo_root = Path(__file__).parents[2]
    engine = PolicyEngine(policy_path=repo_root / "policy" / "rsi-policy.yaml")

    result = engine.evaluate({
        "changed_paths": [
            "policy/rsi-policy.yaml",
            "tools/rsi/policy_engine.py",
            ".github/workflows/rsi-governance.yml",
        ],
        "candidate_test_plan": [],
    })

    assert result["decision"] == "escalate"
    assert result["critical_path_hits"] == [
        "policy/rsi-policy.yaml",
        "tools/rsi/policy_engine.py",
        ".github/workflows/rsi-governance.yml",
    ]
    assert result["protected_path_hits"] == []


def test_repository_policy_still_blocks_protected_paths_when_gate_is_mutated():
    """A protected-path PR cannot downgrade the trusted base policy by editing RSI files."""
    repo_root = Path(__file__).parents[2]
    engine = PolicyEngine(policy_path=repo_root / "policy" / "rsi-policy.yaml")

    result = engine.evaluate({
        "changed_paths": [
            "terraform/rsi_protected_change_poc.tf",
            "policy/rsi-policy.yaml",
            "tools/rsi/decision.py",
        ],
        "candidate_test_plan": [],
    })

    assert result["decision"] == "block"
    assert result["protected_path_hits"] == ["terraform/rsi_protected_change_poc.tf"]
    assert result["critical_path_hits"] == [
        "policy/rsi-policy.yaml",
        "tools/rsi/decision.py",
    ]
