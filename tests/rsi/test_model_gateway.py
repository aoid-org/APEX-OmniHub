import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = Path('tools/rsi/model_gateway.py')


def run_gateway(*args):
    cmd = [sys.executable, str(SCRIPT), *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode, json.loads(proc.stdout)


def write_evidence(payload):
    tf = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False)
    json.dump(payload, tf)
    tf.flush()
    tf.close()
    return tf.name


def test_dry_run_default_shape():
    code, body = run_gateway('--dry-run')
    assert code == 0
    assert body['abort'] is False
    assert set(body.keys()) == {
        'summary', 'risk', 'abort', 'changed_paths', 'protected_path_hits', 'proposed_tests', 'proposed_edits', 'rationale'
    }


def test_missing_evidence_keys_aborts():
    evidence = write_evidence({'changed_paths': []})
    code, body = run_gateway('--dry-run', '--evidence', evidence)
    assert code == 1
    assert body['abort'] is True
    assert body['risk'] == 'high'
    assert 'missing evidence keys' in body['rationale']


def test_rejects_raw_repo_dumps():
    evidence = write_evidence({
        'changed_paths': [],
        'git diff': 'x',
        'inventory summary': 'x',
        'policy path class': 'normal',
        'test plan': [],
        'raw_repo': 'dump'
    })
    code, body = run_gateway('--dry-run', '--evidence', evidence)
    assert code == 1
    assert body['abort'] is True
    assert body['rationale'] == 'raw repo dump rejected'


def test_protected_path_edit_hard_fails():
    evidence = write_evidence({
        'changed_paths': ['docs/rsi/README.md'],
        'git diff': 'x',
        'inventory summary': 'x',
        'policy path class': 'mixed',
        'test plan': ['npm test'],
        'proposed_edits': ['terraform/main.tf']
    })
    code, body = run_gateway('--dry-run', '--evidence', evidence)
    assert code == 2
    assert body['abort'] is True
    assert body['risk'] == 'critical'
    assert body['protected_path_hits'] == ['terraform/main.tf']
