import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path('tools/rsi/model_gateway.py')


def run_gateway(*args):
    proc = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True)
    return proc.returncode, json.loads(proc.stdout)


def test_dry_run_returns_expected_schema():
    code, body = run_gateway('--dry-run')
    assert code == 0
    assert body['abort'] is False
    assert set(body.keys()) == {
        'summary', 'risk', 'abort', 'changed_paths', 'protected_path_hits', 'proposed_tests', 'proposed_edits', 'rationale'
    }
