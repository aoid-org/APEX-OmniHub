#!/usr/bin/env python3
"""Validate an apex-frontend output markdown for required sections.

Usage:
  python validate_artifact.py output.md
"""
from __future__ import annotations
import sys, re, pathlib

REQUIRED = [
  r'^1\)\s*\*\*Mode\s*\+\s*Assumptions\*\*',
  r'^2\)\s*\*\*Failure\s*Patterns',
  r'^3\)\s*\*\*Plan',
  r'^4\)\s*\*\*Executable\s*Artifacts',
  r'^5\)\s*\*\*Verification\s*Package',
  r'^6\)\s*\*\*Next\s*Actions'
]

def main(path: str) -> int:
    p = pathlib.Path(path)
    if not p.exists():
        print(f"Missing file: {p}")
        return 2
    txt = p.read_text(encoding='utf-8', errors='replace')
    ok = True
    for pat in REQUIRED:
        if not re.search(pat, txt, flags=re.M):
            print(f"FAIL: missing section matching: {pat}")
            ok = False
    if ok:
        print("PASS: all required sections present.")
        return 0
    return 1

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1]))
