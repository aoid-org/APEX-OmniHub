"""Tests for tools/rsi/build_evidence.py."""

from __future__ import annotations

# Ensure tools/rsi is importable
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parents[2]))

from tools.rsi.build_evidence import (
    MAX_DIFF_SUMMARY_CHARS,
    MAX_INVENTORY_CHARS,
    _classify_path,
    _get_inventory_summary,
    _get_scoped_diff_summary,
    build_evidence,
)


def _fake_run(stdout_map: dict[str, str]):
    """Factory for a subprocess.run mock that returns stdout based on the first command token."""
    def _inner(cmd, **kwargs):
        key = " ".join(cmd) if isinstance(cmd, list) else cmd
        for pattern, out in stdout_map.items():
            if pattern in key:
                m = MagicMock()
                m.returncode = 0
                m.stdout = out
                m.stderr = ""
                return m
        m = MagicMock()
        m.returncode = 0
        m.stdout = ""
        m.stderr = ""
        return m
    return _inner


def test_ci_mode_reads_env_vars(tmp_artifacts_dir, monkeypatch, tmp_path):
    monkeypatch.setenv("GITHUB_BASE_REF", "main")
    monkeypatch.setenv("GITHUB_HEAD_REF", "feature/rsi")
    monkeypatch.setenv("GITHUB_REPOSITORY", "org/repo")
    monkeypatch.setenv("PR_NUMBER", "99")

    policy_file = tmp_path / "policy" / "rsi-policy.yaml"
    policy_file.parent.mkdir()
    policy_file.write_text(
        "policy_version: 1.3.0\nprotected_paths: []\ncritical_paths: []\n"
    )

    with patch("tools.rsi.build_evidence.POLICY_FILE", policy_file), \
         patch("tools.rsi.build_evidence.INVENTORY_DIR", tmp_path / "inventory"), \
         patch("tools.rsi.build_evidence.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="src/app.ts\n", stderr="")
        bundle = build_evidence(ci_mode=True)

    # CI mode must have been picked up — diff command uses origin/<base>...origin/<head>
    assert bundle["generation_mode"] == "ci"
    assert bundle["repository"]["pr_number"] == 99
    assert bundle["repository"]["base_ref"] == "main"
    assert bundle["repository"]["head_ref"] == "feature/rsi"


def test_local_mode_explicit_args(tmp_artifacts_dir, monkeypatch, tmp_path):
    policy_file = tmp_path / "policy" / "rsi-policy.yaml"
    policy_file.parent.mkdir()
    policy_file.write_text(
        "policy_version: 1.3.0\nprotected_paths: []\ncritical_paths: []\n"
    )

    with patch("tools.rsi.build_evidence.POLICY_FILE", policy_file), \
         patch("tools.rsi.build_evidence.INVENTORY_DIR", tmp_path / "inventory"), \
         patch("tools.rsi.build_evidence.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="src/lib.ts\n", stderr="")
        bundle = build_evidence(base_ref="main", head_ref="feat")

    assert bundle["generation_mode"] == "local"
    assert bundle["repository"]["base_ref"] == "main"
    assert bundle["repository"]["head_ref"] == "feat"


def test_local_mode_fallback(tmp_artifacts_dir, monkeypatch, tmp_path):
    """No args and no GITHUB_* env → falls back to git diff HEAD~1."""
    monkeypatch.delenv("GITHUB_BASE_REF", raising=False)
    monkeypatch.delenv("GITHUB_HEAD_REF", raising=False)
    monkeypatch.delenv("GITHUB_EVENT_NAME", raising=False)

    policy_file = tmp_path / "policy" / "rsi-policy.yaml"
    policy_file.parent.mkdir()
    policy_file.write_text(
        "policy_version: 1.3.0\nprotected_paths: []\ncritical_paths: []\n"
    )

    calls_made: list[list[str]] = []

    def _capture_run(cmd, **kwargs):
        calls_made.append(cmd)
        return MagicMock(returncode=0, stdout="README.md\n", stderr="")

    with patch("tools.rsi.build_evidence.POLICY_FILE", policy_file), \
         patch("tools.rsi.build_evidence.INVENTORY_DIR", tmp_path / "inventory"), \
         patch("tools.rsi.build_evidence.subprocess.run", side_effect=_capture_run):
        build_evidence()

    # At least one call must be a HEAD~1 diff
    head1_calls = [c for c in calls_made if "HEAD~1" in " ".join(c)]
    assert head1_calls, f"Expected HEAD~1 fallback diff, got calls: {calls_made}"


def test_diff_parsing_produces_changed_paths(tmp_artifacts_dir, tmp_path):
    policy_file = tmp_path / "policy" / "rsi-policy.yaml"
    policy_file.parent.mkdir()
    policy_file.write_text(
        "policy_version: 1.3.0\nprotected_paths: []\ncritical_paths: []\n"
    )

    with patch("tools.rsi.build_evidence.POLICY_FILE", policy_file), \
         patch("tools.rsi.build_evidence.INVENTORY_DIR", tmp_path / "inventory"), \
         patch("tools.rsi.build_evidence.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0, stdout="src/app.ts\napi/handler.py\n", stderr=""
        )
        bundle = build_evidence()

    assert isinstance(bundle["changed_paths"], list)
    assert len(bundle["changed_paths"]) > 0


def test_evidence_bundle_schema_valid(tmp_artifacts_dir, tmp_path):
    """Output JSON must contain all required top-level keys."""
    required_keys = [
        "schema_version", "generated_at", "generation_mode", "policy_version",
        "repository", "changed_paths", "classified_paths", "protected_path_hits",
        "diff_stats", "scoped_diff_summary", "inventory_summary",
        "manifests_touched", "workflows_touched", "candidate_test_plan",
    ]
    policy_file = tmp_path / "policy" / "rsi-policy.yaml"
    policy_file.parent.mkdir()
    policy_file.write_text(
        "policy_version: 1.3.0\nprotected_paths: []\ncritical_paths: []\n"
    )

    with patch("tools.rsi.build_evidence.POLICY_FILE", policy_file), \
         patch("tools.rsi.build_evidence.INVENTORY_DIR", tmp_path / "inventory"), \
         patch("tools.rsi.build_evidence.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")
        bundle = build_evidence()

    for key in required_keys:
        assert key in bundle, f"Missing required key: {key}"


def test_scoped_diff_truncated_at_2000_chars():
    """scoped_diff_summary must not exceed MAX_DIFF_SUMMARY_CHARS."""
    huge_diff = "x" * 5000
    with patch("tools.rsi.build_evidence.subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout=huge_diff, stderr="")
        summary = _get_scoped_diff_summary(["src/app.ts"])

    assert len(summary) <= MAX_DIFF_SUMMARY_CHARS + len("[TRUNCATED]")
    assert "[TRUNCATED]" in summary


def test_inventory_summary_bounded(tmp_path):
    """inventory_summary must be bounded to MAX_INVENTORY_CHARS."""
    from tools.rsi import build_evidence as be_module

    huge_content = "line\n" * 1000
    meta_file = tmp_path / "repo_meta.txt"
    meta_file.write_text(huge_content)

    with patch.object(be_module, "INVENTORY_DIR", tmp_path):
        summary = _get_inventory_summary()

    assert len(summary) <= MAX_INVENTORY_CHARS


def test_inventory_summary_prefers_workflow_generated_file(tmp_path):
    """Trusted workflow inventory must win over fallback files or scripts."""
    from tools.rsi import build_evidence as be_module

    inventory_file = tmp_path / "repo-inventory.txt"
    inventory_file.write_text("trusted workflow inventory", encoding="utf-8")
    meta_dir = tmp_path / "inventory"
    meta_dir.mkdir()
    (meta_dir / "repo_meta.txt").write_text("fallback meta", encoding="utf-8")

    with patch.object(be_module, "INVENTORY_FILE", inventory_file), \
         patch.object(be_module, "INVENTORY_DIR", meta_dir), \
         patch("tools.rsi.build_evidence.subprocess.run") as mock_run:
        summary = _get_inventory_summary()

    assert summary == "trusted workflow inventory"
    mock_run.assert_not_called()


def test_protected_path_classification(tmp_path):
    """Paths matching protected_paths patterns appear in protected_path_hits."""
    policy_file = tmp_path / "policy" / "rsi-policy.yaml"
    policy_file.parent.mkdir()
    policy_file.write_text(
        "policy_version: 1.3.0\n"
        "protected_paths:\n  - .github/workflows/**\n"
        "critical_paths: []\n"
    )

    result = _classify_path(
        ".github/workflows/ci.yml",
        [".github/workflows/**"],
        [],
    )
    assert result == "protected"


def test_docs_only_classification():
    """All-docs paths must classify as docs-only."""
    result = _classify_path("docs/rsi/README.md", [], [])
    assert result == "docs-only"

    result2 = _classify_path("CHANGELOG.md", [], [])
    assert result2 == "docs-only"

    result3 = _classify_path("src/app.ts", [], [])
    assert result3 == "standard"
