#!/usr/bin/env python3
"""
APEX manifest validator.

Two modes:
  default     : validate package_manifest.json against actual repo contents
  --regenerate: rebuild package_manifest.json from actual repo contents

Validation checks:
  1. Every file listed in manifest exists.
  2. Every governance/CI/.github file in the repo is listed in the manifest.
  3. SHA-256 hash of every listed file matches the manifest entry.

Exit codes:
  0 = pass
  1 = validation failure
  2 = unrecoverable error (e.g. malformed manifest)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path.cwd()
MANIFEST_FILENAME = "package_manifest.json"
MANIFEST_PATH = ROOT / MANIFEST_FILENAME

INCLUDED_DIRS = ("governance", ".github")
INCLUDED_TOP_FILES = (
    "README.md", "CHANGELOG.md", "CONTRIBUTING.md",
    "LICENSE", "SECURITY.md", "Makefile",
)

SKIP_NAMES = {".DS_Store"}
SKIP_DIRS = {"__pycache__", ".pytest_cache", ".mypy_cache"}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _scan_dir(d: str) -> list[Path]:
    out: list[Path] = []
    base = ROOT / d
    if not base.is_dir():
        return out
    for p in base.rglob("*"):
        if not p.is_file():
            continue
        if p.name in SKIP_NAMES:
            continue
        if any(part in SKIP_DIRS for part in p.relative_to(ROOT).parts):
            continue
        out.append(p)
    return out


def discover_files() -> list[Path]:
    out: list[Path] = []
    for d in INCLUDED_DIRS:
        out.extend(_scan_dir(d))
    for f in INCLUDED_TOP_FILES:
        p = ROOT / f
        if p.is_file():
            out.append(p)
    return sorted(out, key=lambda p: str(p.relative_to(ROOT)))


def build_manifest(version: str = "1.1.0") -> dict:
    files = discover_files()
    entries: list[dict] = []
    for p in files:
        entries.append({
            "path": str(p.relative_to(ROOT)).replace("\\", "/"),
            "sha256": sha256_file(p),
            "bytes": p.stat().st_size,
        })
    return {
        "package": "APEX_BIBLE_COMPLETE_PACKAGE",
        "version": version,
        "created_for": "APEX Business Systems LTD",
        "primary_entrypoints": {
            "doctrine": "governance/doctrine/APEX_BUILD_DOCTRINE.md",
            "index": "governance/INDEX.md",
            "ci": ".github/workflows/apex-governance.yml",
            "rfc": "governance/rfc/RFC_TEMPLATE.md",
            "ai_prompt": "governance/ai/AI_AGENT_SYSTEM_PROMPT.md",
            "merge_rights": "governance/architecture/MERGE_RIGHTS_POLICY.md",
            "rubric": "governance/rubrics/APEX_BUILD_RUBRIC_100.md",
            "rubric_guide": "governance/rubrics/RUBRIC_SCORING_GUIDE.md",
        },
        "file_count": len(entries),
        "files": entries,
    }


def regenerate() -> int:
    # Preserve existing version if present unless explicitly bumped elsewhere.
    version = "1.1.0"
    if MANIFEST_PATH.exists():
        try:
            existing = json.loads(MANIFEST_PATH.read_text())
            version = existing.get("version", version)
        except (json.JSONDecodeError, OSError):
            pass

    manifest = build_manifest(version=version)
    # Self-exclude the manifest file itself from its own entries
    # (chicken-and-egg: hash would change after writing).
    manifest["files"] = [f for f in manifest["files"] if f["path"] != MANIFEST_FILENAME]
    manifest["file_count"] = len(manifest["files"])

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Regenerated manifest with {manifest['file_count']} files at version {manifest['version']}.")
    return 0


def _find_errors(declared: dict, actual: dict) -> list[str]:
    errors: list[str] = []
    for path in declared:
        if path not in actual:
            errors.append(f"Declared in manifest but missing on disk: {path}")
    for path in actual:
        if path not in declared:
            errors.append(f"On disk but not declared in manifest: {path}")
    for path, entry in declared.items():
        if path in actual:
            actual_hash = sha256_file(actual[path])
            if actual_hash != entry.get("sha256"):
                errors.append(f"SHA-256 mismatch: {path}")
                errors.append(f"  declared: {entry.get('sha256')}")
                errors.append(f"  actual:   {actual_hash}")
    return errors


def validate() -> int:
    if not MANIFEST_PATH.exists():
        print(f"Manifest missing: {MANIFEST_PATH.relative_to(ROOT)}", file=sys.stderr)
        return 2
    try:
        manifest = json.loads(MANIFEST_PATH.read_text())
    except json.JSONDecodeError as e:
        print(f"Manifest invalid JSON: {e}", file=sys.stderr)
        return 2

    declared = {f["path"]: f for f in manifest.get("files", [])}
    actual = {str(p.relative_to(ROOT)).replace("\\", "/"): p for p in discover_files()}
    actual.pop(MANIFEST_FILENAME, None)

    errors = _find_errors(declared, actual)

    if errors:
        print("APEX manifest validation failed:\n")
        for e in errors:
            print(f"- {e}")
        print("\nRun: make apex-manifest  # to regenerate")
        return 1

    print(f"APEX manifest valid. {len(declared)} files verified, version {manifest.get('version')}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="APEX manifest validator")
    parser.add_argument("--regenerate", action="store_true", help="Rebuild manifest from disk")
    args = parser.parse_args()
    return regenerate() if args.regenerate else validate()


if __name__ == "__main__":
    sys.exit(main())
