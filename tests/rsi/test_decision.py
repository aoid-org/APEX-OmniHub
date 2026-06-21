"""Tests for tools/rsi/decision.py."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2]))

from tools.rsi.decision import combine, run_decision
from tools.rsi.types import REQUIRED_DECISION_FIELDS

BLOCK_POLICY = {
    "decision": "block",
    "protected_path_hits": [".github/workflows/ci.yml"],
    "critical_path_hits": [],
    "required_tests": ["security-audit"],
    "recommended_reviewers": ["@security"],
    "model_usage_allowed": False,
    "rationale": "Protected path touched.",
    "policy_version": "1.3.0",
    "checked_at": "2026-05-15T00:00:00Z",
}

ESCALATE_POLICY = {
    "decision": "escalate",
    "protected_path_hits": [],
    "critical_path_hits": ["orchestrator/workflows/deploy.py"],
    "required_tests": ["orchestrator-unit-tests"],
    "recommended_reviewers": ["@platform"],
    "model_usage_allowed": True,
    "rationale": "Critical path touched.",
    "policy_version": "1.3.0",
    "checked_at": "2026-05-15T00:00:00Z",
}

ALLOW_POLICY = {
    "decision": "allow",
    "protected_path_hits": [],
    "critical_path_hits": [],
    "required_tests": ["frontend-unit-tests"],
    "recommended_reviewers": [],
    "model_usage_allowed": False,
    "rationale": "No violations.",
    "policy_version": "1.3.0",
    "checked_at": "2026-05-15T00:00:00Z",
}

AVAILABLE_MODEL = {
    "model_available": True,
    "error": None,
    "model_decision": "allow",
    "confidence": "high",
    "risk_assessment": "low",
    "rationale": "Advisory: looks safe.",
    "additional_tests": ["extra-test"],
    "additional_reviewers": ["@extra-reviewer"],
}

UNAVAILABLE_MODEL = {
    "model_available": False,
    "error": "TIMEOUT",
    "model_decision": None,
    "confidence": None,
    "risk_assessment": None,
    "rationale": None,
    "additional_tests": [],
    "additional_reviewers": [],
}


def test_deterministic_block_overrides_model():
    """block from policy + model 'allow' advisory → final decision is still block."""
    result = combine(BLOCK_POLICY, AVAILABLE_MODEL)
    assert result["decision"] == "block"
    assert result["abort"] is True
    assert result["model_summary"]["model_decision"] == "allow"  # recorded but overridden


def test_escalate_no_model_blocks():
    """Escalation required + model unavailable -> stays escalate."""
    result = combine(ESCALATE_POLICY, UNAVAILABLE_MODEL)
    assert result["decision"] == "escalate"


def test_escalate_with_model_allow_stays_escalate():
    """Escalation + model says allow → final is escalate (not allow)."""
    result = combine(ESCALATE_POLICY, AVAILABLE_MODEL)
    assert result["decision"] == "escalate"
    assert result["abort"] is False


def test_allow_skips_model():
    """allow from policy → model is not consulted (model_summary recorded as passed in)."""
    result = combine(ALLOW_POLICY, None)
    assert result["decision"] == "allow"
    assert result["abort"] is False
    assert result["model_summary"] is None


def test_abort_true_only_on_block():
    """abort: true IFF decision == block."""
    block_result = combine(BLOCK_POLICY, None)
    assert block_result["abort"] is True

    escalate_result = combine(ESCALATE_POLICY, AVAILABLE_MODEL)
    assert escalate_result["abort"] is False

    allow_result = combine(ALLOW_POLICY, None)
    assert allow_result["abort"] is False


def test_required_tests_merged_and_deduplicated():
    policy = {**ESCALATE_POLICY, "required_tests": ["test-a", "test-b"]}
    model = {**AVAILABLE_MODEL, "additional_tests": ["test-b", "test-c"]}
    result = combine(policy, model)
    tests = result["required_tests"]
    assert "test-a" in tests
    assert "test-b" in tests
    assert "test-c" in tests
    assert tests.count("test-b") == 1  # deduplicated


def test_reviewers_merged_and_deduplicated():
    policy = {**ESCALATE_POLICY, "recommended_reviewers": ["@alice", "@bob"]}
    model = {**AVAILABLE_MODEL, "additional_reviewers": ["@bob", "@carol"]}
    result = combine(policy, model)
    reviewers = result["recommended_reviewers"]
    assert "@alice" in reviewers
    assert "@bob" in reviewers
    assert "@carol" in reviewers
    assert reviewers.count("@bob") == 1


def test_decision_json_written_to_artifact_path(tmp_artifacts_dir):
    """decision.json must be written to artifacts/rsi/decision.json."""
    from unittest.mock import patch
    (tmp_artifacts_dir / "policy_result.json").write_text(json.dumps(ALLOW_POLICY))

    with patch("tools.rsi.decision.ARTIFACT_DIR", tmp_artifacts_dir):
        rc = run_decision()

    assert rc == 0
    out = tmp_artifacts_dir / "decision.json"
    assert out.exists()


def test_exit_code_1_on_block(tmp_artifacts_dir):
    from unittest.mock import patch
    (tmp_artifacts_dir / "policy_result.json").write_text(json.dumps(BLOCK_POLICY))

    with patch("tools.rsi.decision.ARTIFACT_DIR", tmp_artifacts_dir):
        rc = run_decision()

    assert rc == 1


def test_exit_code_0_on_allow(tmp_artifacts_dir):
    from unittest.mock import patch
    (tmp_artifacts_dir / "policy_result.json").write_text(json.dumps(ALLOW_POLICY))

    with patch("tools.rsi.decision.ARTIFACT_DIR", tmp_artifacts_dir):
        rc = run_decision()

    assert rc == 0


def test_decision_schema_complete():
    """All REQUIRED_DECISION_FIELDS must be present in output."""
    result = combine(ALLOW_POLICY, None)
    missing = [k for k in REQUIRED_DECISION_FIELDS if k not in result]
    assert not missing, f"Missing fields: {missing}"


def test_risk_mapping_correct():
    """block→critical, escalate→high, allow docs-only→low."""
    block_result = combine(BLOCK_POLICY, None)
    assert block_result["risk"] == "critical"

    escalate_result = combine(ESCALATE_POLICY, AVAILABLE_MODEL)
    assert escalate_result["risk"] == "high"

    evidence_docs = {
        "changed_paths": ["docs/README.md"],
        "classified_paths": {"docs/README.md": "docs-only"},
    }
    allow_docs = combine(ALLOW_POLICY, None, evidence_docs)
    assert allow_docs["risk"] == "low"

def test_pass_for_owner_review():
    evidence = {
        "changed_paths": ["terraform/environments/production/main.tf"],
        "classified_paths": {"terraform/environments/production/main.tf": "protected"},
        "pr_body": """
## RSI Evidence
- List of protected files touched: terraform/environments/production/main.tf
- Reason for touching production Terraform: testing
- Confirmation that Ops Doc Guard documentation was updated where required: yes
- Terraform/HCP plan status: PASSED
- Production routing flip status: EXPLICITLY APPROVED
- User-shoes validation result: GO
- BYOM / Connect AI live validation result if in scope: GO
- Confirmation that no sensitive credentials were exposed in evidence: yes
- Final recommendation: MERGE BY REPO OWNER
        """
    }
    result = combine(BLOCK_POLICY, None, evidence)
    assert result["decision"] == "escalate"
    assert result["abort"] is False
    assert result["approval_model"] == "repo_owner_manual_merge_is_final_approval"
    assert result["owner_review_status"] == "ready_for_owner_merge"
    assert result["risk"] == "critical"
