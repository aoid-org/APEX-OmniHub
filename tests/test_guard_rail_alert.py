import os
import subprocess
import sys
import tempfile

import pytest

pytestmark = pytest.mark.skipif(sys.platform == 'win32', reason='grep not available on windows')
"""
Tests for guard rail violation detection logic.
Validates grep pattern matching used in CI workflow.
"""


def test_guard_rail_violation_detected():
    """Grep should match GUARD_RAIL_VIOLATION in log files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        logfile = os.path.join(tmpdir, "ci.log")
        with open(logfile, "w") as f:
            f.write("INFO: Running tests...\n")
            f.write("ERROR: GUARD_RAIL_VIOLATION detected in policy evaluation\n")
            f.write("INFO: Done\n")

        result = subprocess.run(
            [
                "grep",
                "-rqE",
                "GUARD_RAIL_VIOLATION|policy breach|tri-force violation",
                tmpdir,
            ],
            capture_output=True,
        )
        assert result.returncode == 0, "Expected grep to find GUARD_RAIL_VIOLATION"


def test_policy_breach_detected():
    """Grep should match 'policy breach' variant."""
    with tempfile.TemporaryDirectory() as tmpdir:
        logfile = os.path.join(tmpdir, "run.log")
        with open(logfile, "w") as f:
            f.write("WARN: policy breach on tool=delete_record\n")

        result = subprocess.run(
            [
                "grep",
                "-rqE",
                "GUARD_RAIL_VIOLATION|policy breach|tri-force violation",
                tmpdir,
            ],
            capture_output=True,
        )
        assert result.returncode == 0


def test_no_false_positive_on_clean_logs():
    """Grep should NOT match clean logs (exit code 1)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        logfile = os.path.join(tmpdir, "clean.log")
        with open(logfile, "w") as f:
            f.write("INFO: All checks passed\nINFO: Build succeeded\n")

        result = subprocess.run(
            [
                "grep",
                "-rqE",
                "GUARD_RAIL_VIOLATION|policy breach|tri-force violation",
                tmpdir,
            ],
            capture_output=True,
        )
        assert result.returncode == 1, "Expected no match on clean logs"
