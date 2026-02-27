#!/usr/bin/env python3
"""Validate common apex-frontend artifacts (markdown) for required sections.

Usage:
  python scripts/validate_artifact.py --type screen-spec path/to/file.md
  python scripts/validate_artifact.py --type ux-brief path/to/file.md
  python scripts/validate_artifact.py --type component-spec path/to/file.md

Exit codes:
  0 = pass
  1 = fail
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

REQUIREMENTS = {
    "ux-brief": [
        r"^##\s*1\.?\s*Users",
        r"^##\s*2\.?\s*Job",
        r"^##\s*3\.?\s*Success",
        r"^##\s*5\.?\s*Primary\s*flow",
        r"^##\s*7\.?\s*Acceptance\s*criteria",
    ],
    "screen-spec": [
        r"^##\s*Purpose",
        r"^##\s*Primary\s*action",
        r"^##\s*Navigation",
        r"^##\s*Components",
        r"^##\s*States",
        r"^##\s*Acceptance\s*criteria",
    ],
    "component-spec": [
        r"^##\s*Purpose",
        r"^##\s*Props",
        r"^##\s*States",
        r"^##\s*Accessibility",
        r"^##\s*Visual\s*tokens",
        r"^##\s*Tests",
    ],
    "bug-report": [
        r"^##\s*Summary",
        r"^##\s*Repro\s*steps",
        r"^##\s*Environment",
        r"^##\s*Fix\s*plan",
        r"^##\s*Verification",
        r"^##\s*Prevention",
    ],
    "perf-budget": [
        r"^##\s*Budgets",
        r"^##\s*Measurement\s*method",
        r"^##\s*Current\s*baseline",
        r"^##\s*Fix\s*plan",
        r"^##\s*Regression\s*guard",
    ],
}

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", required=True, choices=sorted(REQUIREMENTS.keys()))
    ap.add_argument("path", type=str)
    args = ap.parse_args()

    p = Path(args.path)
    if not p.exists():
        print(f"FAIL: file not found: {p}")
        return 1

    text = p.read_text(encoding="utf-8", errors="replace").splitlines()
    missing = []
    for pattern in REQUIREMENTS[args.type]:
        rx = re.compile(pattern, re.IGNORECASE)
        if not any(rx.search(line) for line in text):
            missing.append(pattern)

    if missing:
        print(f"FAIL: {p} is missing required sections for type '{args.type}':")
        for m in missing:
            print(f"  - {m}")
        return 1

    print(f"PASS: {p} looks like a valid '{args.type}' artifact.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
