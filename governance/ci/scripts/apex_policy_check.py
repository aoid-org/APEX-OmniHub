#!/usr/bin/env python3
"""
APEX policy check.

Purpose:
- catch obvious governance violations in CI
- enforce RFC completeness when RFC files are present
- flag god-object naming and forbidden coupling patterns

This script is intentionally conservative. It does not replace human architecture review.

v1.1.0 changes:
- Config-aware: governance/, docs/, .github/ markdown is exempt from pattern scans
  (those files DESCRIBE forbidden patterns; they should not be flagged).
- Forbidden-name detection now requires word-boundary match in code identifiers,
  preventing false positives like ResourceManager.ts triggering on "Manager".
- The policy config file is exempt from scanning itself.
- Exit codes: 0 = pass, 1 = violations, 2 = config error.
- Output: machine-readable JSON via --json flag, human-readable by default.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Iterable

ROOT = Path.cwd()
CONFIG_PATH = ROOT / "governance" / "ci" / "apex-policy.config.json"

# Directories whose contents are governance/documentation by definition and
# therefore exempt from forbidden-pattern scans (they describe what is forbidden).
DOCUMENTATION_DIRS: set[str] = {"governance", "docs", ".github"}

# Repo-root documentation files that describe the governance package itself.
# These often reference forbidden patterns by name (e.g. CHANGELOG describing
# what the patterns are) and must be exempt from pattern scans.
DOCUMENTATION_FILES: set[str] = {
    "README.md", "CHANGELOG.md", "CONTRIBUTING.md",
    "SECURITY.md", "LICENSE",
}

# Directories never scanned for any reason.
SKIP_DIRS: set[str] = {
    ".git", "node_modules", "dist", "build", ".next", "coverage",
    "vendor", ".turbo", ".vercel", ".wrangler", "out", ".cache",
    ".pytest_cache", ".mypy_cache", "__pycache__",
}

TEXT_SUFFIXES: set[str] = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".txt",
    ".yml", ".yaml", ".json", ".sql", ".rs", ".go", ".java",
}

CODE_SUFFIXES: set[str] = {".py", ".ts", ".tsx", ".js", ".jsx", ".rs", ".go", ".java"}


def is_documentation_path(rel_parts: tuple[str, ...]) -> bool:
    """True if the file lives inside a documentation directory or is a top-level documentation file."""
    if any(part in DOCUMENTATION_DIRS for part in rel_parts):
        return True
    # Top-level (depth 1) documentation files: README.md, CHANGELOG.md, etc.
    if len(rel_parts) == 1 and rel_parts[0] in DOCUMENTATION_FILES:
        return True
    return False


def is_config_self(path: Path) -> bool:
    """True if path is the policy config itself; never scan."""
    try:
        return path.resolve() == CONFIG_PATH.resolve()
    except OSError:
        return False


def check_forbidden_names(content: str, filename: str, forbidden: Iterable[str]) -> list[str]:
    """
    Word-boundary match for forbidden god-object names.
    Triggers only on real identifier usage (class/function/interface/type/const declarations)
    or filename match — not arbitrary substring hits.
    """
    hits: list[str] = []
    for name in forbidden:
        # Filename match: exact stem or stem-with-extension.
        stem = filename.rsplit(".", 1)[0]
        if stem == name or filename == name:
            hits.append(name)
            continue
        # Identifier declarations in code: class/function/interface/type/const Foo
        decl_re = re.compile(
            rf"\b(class|function|interface|type|const|let|var|def|struct|enum)\s+{re.escape(name)}\b"
        )
        if decl_re.search(content):
            hits.append(name)
    return hits


def check_forbidden_patterns(content: str, patterns: Iterable[str]) -> list[str]:
    """Substring match. Caller decides whether the file is in scope."""
    return [p for p in patterns if p in content]


def check_rfc_completeness(root: Path, required_sections: list[str]) -> list[str]:
    """Every concrete RFC under governance/rfc/ or docs/**/RFC*.md must contain required sections."""
    errors: list[str] = []
    skip_filenames = {"RFC_TEMPLATE.md", "RFC_USAGE_POLICY.md"}
    candidates: list[Path] = []
    rfc_dir = root / "governance" / "rfc"
    if rfc_dir.is_dir():
        candidates.extend(rfc_dir.glob("*.md"))
    docs_dir = root / "docs"
    if docs_dir.is_dir():
        candidates.extend(docs_dir.glob("**/RFC*.md"))
        candidates.extend(docs_dir.glob("**/rfc-*.md"))

    for rfc in candidates:
        if rfc.name in skip_filenames:
            continue
        try:
            content = rfc.read_text(errors="ignore")
        except OSError:
            continue
        for section in required_sections:
            if f"## {section}" not in content and f"# {section}" not in content:
                errors.append(f"RFC missing required section '{section}': {rfc.relative_to(root)}")
    return errors


def check_module_size(path: Path, content: str, max_lines: int) -> str | None:
    if path.suffix not in CODE_SUFFIXES:
        return None
    line_count = len(content.splitlines())
    if line_count > max_lines:
        return f"Module exceeds {max_lines} lines: {path} ({line_count} lines)"
    return None


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        print(f"APEX policy config missing: {CONFIG_PATH.relative_to(ROOT)}", file=sys.stderr)
        sys.exit(2)
    try:
        return json.loads(CONFIG_PATH.read_text())
    except json.JSONDecodeError as e:
        print(f"APEX policy config invalid JSON: {e}", file=sys.stderr)
        sys.exit(2)


def _scan_file_errors(
    path: Path,
    strict_docs: bool,
    forbidden_names: list[str],
    forbidden_patterns: list[str],
    max_module_lines: int,
) -> list[str] | None:
    """Return None to skip the file; otherwise return a (possibly empty) list of violations."""
    rel_parts = path.relative_to(ROOT).parts
    if any(part in SKIP_DIRS for part in rel_parts):
        return None
    if path.suffix not in TEXT_SUFFIXES:
        return None
    if is_config_self(path):
        return None
    try:
        content = path.read_text(errors="ignore")
    except OSError:
        return None

    rel = str(path.relative_to(ROOT))
    in_docs = is_documentation_path(rel_parts)
    errors: list[str] = []
    if not in_docs:
        for hit in check_forbidden_names(content, path.name, forbidden_names):
            errors.append(f"Forbidden god-object style name detected: {hit} in {rel}")
    if not in_docs or strict_docs:
        for hit in check_forbidden_patterns(content, forbidden_patterns):
            errors.append(f"Forbidden pattern detected: '{hit}' in {rel}")
    size_err = check_module_size(path, content, max_module_lines)
    if size_err:
        errors.append(size_err)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="APEX policy check")
    parser.add_argument("--json", action="store_true", help="Emit JSON report on stdout")
    parser.add_argument("--strict-docs", action="store_true",
                        help="Also scan documentation dirs for forbidden patterns (off by default)")
    parser.add_argument("files", nargs="*", type=Path, help="Specific files to scan. If empty, scan all.")
    args = parser.parse_args()

    config = load_config()
    forbidden_names: list[str] = config.get("forbidden_names", [])
    forbidden_patterns: list[str] = config.get("forbidden_patterns", [])
    max_module_lines: int = int(config.get("max_module_lines", 500))
    required_rfc_sections: list[str] = config.get("required_rfc_sections", [])

    errors: list[str] = []
    files_scanned = 0

    paths_to_scan = args.files if args.files else ROOT.rglob("*")

    for path in paths_to_scan:
        # Resolve to absolute path relative to ROOT to ensure we can do relative_to later
        path = path.resolve()
        if not path.is_file():
            continue
        # Make sure path is under ROOT
        if not str(path).startswith(str(ROOT)):
            continue

        file_errors = _scan_file_errors(
            path, args.strict_docs, forbidden_names, forbidden_patterns, max_module_lines
        )
        if file_errors is None:
            continue
        files_scanned += 1
        errors.extend(file_errors)

    if not args.files:
        errors.extend(check_rfc_completeness(ROOT, required_rfc_sections))

    if args.json:
        report = {
            "passed": not errors,
            "files_scanned": files_scanned,
            "violations": errors,
            "config_version": config.get("version", "unknown"),
        }
        print(json.dumps(report, indent=2))
    else:
        if errors:
            print("APEX policy check failed:\n")
            for err in errors:
                print(f"- {err}")
            print(f"\nFiles scanned: {files_scanned}")
        else:
            print(f"APEX policy check passed. Files scanned: {files_scanned}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
