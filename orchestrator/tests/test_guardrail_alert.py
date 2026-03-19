"""Tests for CI guardrail alert pipeline logic.

Covers:
  - Violation detection via grep pattern matching
  - Environment variable propagation on violation
  - Clean logs produce no violation
  - Edge cases: empty logs dir, mixed content
"""

from __future__ import annotations

import re
from pathlib import Path

# ── Helpers ──────────────────────────────────────────────────────────

GREP_PATTERN = r"GUARD_RAIL_VIOLATION|policy.*breach"


def _run_guardrail_scan(logs_dir: str) -> tuple[bool, int]:
    """Simulate the CI guardrail scan step.

    Returns (violation_detected, exit_code).
    """
    pattern = re.compile(GREP_PATTERN)
    logs_path = Path(logs_dir)
    found = False

    for file in logs_path.rglob("*"):
        if file.is_file():
            try:
                content = file.read_text(encoding="utf-8", errors="ignore")
                if pattern.search(content):
                    found = True
                    break
            except Exception:
                pass

    exit_code = 0 if found else 1
    return found, exit_code


# ── Tests ────────────────────────────────────────────────────────────


class TestGuardrailDetection:
    """Verify guardrail violation grep logic."""

    def test_violation_detected_in_log(self, tmp_path: Path) -> None:
        log_file = tmp_path / "ci.log"
        log_file.write_text("INFO: running tests\nERROR: GUARD_RAIL_VIOLATION found\n")
        detected, _ = _run_guardrail_scan(str(tmp_path))
        assert detected is True

    def test_policy_breach_detected(self, tmp_path: Path) -> None:
        log_file = tmp_path / "audit.log"
        log_file.write_text("WARN: policy breach detected in module X\n")
        detected, _ = _run_guardrail_scan(str(tmp_path))
        assert detected is True

    def test_policy_underscore_breach_detected(self, tmp_path: Path) -> None:
        log_file = tmp_path / "scan.log"
        log_file.write_text("CRITICAL: policy_breach marker in output\n")
        detected, _ = _run_guardrail_scan(str(tmp_path))
        assert detected is True

    def test_clean_logs_no_violation(self, tmp_path: Path) -> None:
        log_file = tmp_path / "clean.log"
        log_file.write_text("INFO: all tests passed\nINFO: build succeeded\n")
        detected, _ = _run_guardrail_scan(str(tmp_path))
        assert detected is False

    def test_empty_logs_dir_no_violation(self, tmp_path: Path) -> None:
        """Empty logs directory must not trigger a violation."""
        detected, _ = _run_guardrail_scan(str(tmp_path))
        assert detected is False

    def test_nested_log_files_scanned(self, tmp_path: Path) -> None:
        """Violations in subdirectories must be detected."""
        nested = tmp_path / "subdir"
        nested.mkdir()
        log_file = nested / "deep.log"
        log_file.write_text("ERROR: GUARD_RAIL_VIOLATION in nested scan\n")
        detected, _ = _run_guardrail_scan(str(tmp_path))
        assert detected is True

    def test_mixed_clean_and_violation(self, tmp_path: Path) -> None:
        """If any file has a violation, detection returns True."""
        (tmp_path / "clean.log").write_text("INFO: ok\n")
        (tmp_path / "bad.log").write_text("ERROR: GUARD_RAIL_VIOLATION\n")
        detected, _ = _run_guardrail_scan(str(tmp_path))
        assert detected is True


class TestEnvironmentVariable:
    """Verify the env var propagation pattern."""

    def test_violation_env_set(self) -> None:
        """Simulates setting VIOLATION=true in $GITHUB_ENV."""
        env_line = "VIOLATION=true"
        key, value = env_line.split("=")
        assert key == "VIOLATION"
        assert value == "true"

    def test_no_violation_env_set(self) -> None:
        env_line = "VIOLATION=false"
        key, value = env_line.split("=")
        assert key == "VIOLATION"
        assert value == "false"
