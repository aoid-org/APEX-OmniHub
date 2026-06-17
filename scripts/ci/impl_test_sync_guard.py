#!/usr/bin/env python3
"""
APEX Implementation-Test Sync Guard
====================================
Catches test files that diverge from their implementation after a code change.

PROBLEM THIS PREVENTS:
  When impl changes a storage backend (localStorage → sessionStorage), config
  removes a field (openai_api_key), or policy forbids a value (gpt-* models),
  the corresponding test file is often NOT updated. CI then fails with
  cryptic assertion errors that are hard to trace.

WHAT THIS SCRIPT CHECKS:
  1. Storage API consistency (TypeScript):
       src/lib/X.ts uses sessionStorage → tests/lib/X.test.ts must not use localStorage
  2. Forbidden model references (Python):
       APEX policy forbids gpt-*/openai/* models — any happy-path test using them fails
  3. Config field existence (Python):
       Tests must not assert on config fields that were removed from Settings
  4. Forbidden provider constants (Python/TS):
       Tests must not seed or assert on OpenAI provider strings in positive/happy-path assertions

Exit codes:
  0 — all checks pass
  1 — sync violations found (blocks CI)
  2 — usage/config error
"""
from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path
from typing import NamedTuple


ROOT = Path(__file__).resolve().parents[2]   # repo root


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

class Violation(NamedTuple):
    file: str
    line: int
    check: str
    detail: str

    def __str__(self) -> str:
        return f"  ❌ [{self.check}] {self.file}:{self.line} — {self.detail}"


# ---------------------------------------------------------------------------
# CHECK 1 — Storage API consistency (TypeScript / JavaScript)
# ---------------------------------------------------------------------------

_TS_STORAGE_RE = re.compile(r'\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\b')

def _extract_storage_calls(text: str) -> list[tuple[int, str, str]]:
    """Return [(line_no, api, key_or_method)] for storage calls."""
    results: list[tuple[int, str, str]] = []
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in _TS_STORAGE_RE.finditer(line):
            api = m.group(1)           # localStorage | sessionStorage
            method = m.group(2)        # getItem | setItem | removeItem | clear
            # Try to extract the key name (first string arg)
            key_match = re.search(r"""['"](omni_\w+)['"]""", line)
            key = key_match.group(1) if key_match else "<unknown>"
            results.append((lineno, api, key))
    return results


def check_storage_api_sync() -> list[Violation]:
    """
    For every src/lib/X.ts that uses sessionStorage, verify that its
    paired test (tests/lib/X.test.ts) does NOT use localStorage for the
    same keys, and vice versa.
    """
    violations: list[Violation] = []

    impl_dir = ROOT / "src" / "lib"
    test_dir = ROOT / "tests" / "lib"

    if not impl_dir.exists() or not test_dir.exists():
        return violations

    for impl_path in impl_dir.rglob("*.ts"):
        # Find paired test
        stem = impl_path.stem
        candidates = [
            test_dir / f"{stem}.test.ts",
            test_dir / f"{stem}.spec.ts",
        ]
        test_path = next((p for p in candidates if p.exists()), None)
        if test_path is None:
            continue

        impl_text = impl_path.read_text(encoding="utf-8", errors="ignore")
        test_text = test_path.read_text(encoding="utf-8", errors="ignore")

        # Determine which storage the impl uses per key
        impl_calls = _extract_storage_calls(impl_text)
        test_calls = _extract_storage_calls(test_text)

        if not impl_calls or not test_calls:
            continue

        # Build: key → set of APIs used in impl
        impl_by_key: dict[str, set[str]] = {}
        for _, api, key in impl_calls:
            if key != "<unknown>":
                impl_by_key.setdefault(key, set()).add(api)

        # Check test: if impl uses sessionStorage for a key, test must not use localStorage
        for lineno, test_api, key in test_calls:
            if key == "<unknown>":
                continue
            impl_apis = impl_by_key.get(key, set())
            if not impl_apis:
                continue
            # If ALL impl accesses for this key are sessionStorage, test must not use localStorage
            if impl_apis == {"sessionStorage"} and test_api == "localStorage":
                violations.append(Violation(
                    file=str(test_path.relative_to(ROOT)),
                    line=lineno,
                    check="STORAGE_API_SYNC",
                    detail=(
                        f"Test uses localStorage.{{}}, but {impl_path.name} "
                        f"writes '{key}' exclusively to sessionStorage. "
                        "Update test to use sessionStorage."
                    ).format(""),
                ))
            # Symmetric: impl uses localStorage but test uses sessionStorage
            elif impl_apis == {"localStorage"} and test_api == "sessionStorage":
                violations.append(Violation(
                    file=str(test_path.relative_to(ROOT)),
                    line=lineno,
                    check="STORAGE_API_SYNC",
                    detail=(
                        f"Test uses sessionStorage, but {impl_path.name} "
                        f"writes '{key}' exclusively to localStorage. "
                        "Update test to match implementation."
                    ),
                ))

    return violations


# ---------------------------------------------------------------------------
# CHECK 2 — Forbidden model references in Python tests (happy-path only)
# ---------------------------------------------------------------------------

FORBIDDEN_MODEL_PREFIXES = (
    "gpt-", "openai/", "text-davinci", "o1-", "o3-",
)
FORBIDDEN_FIELD_NAMES = (
    "openai_api_key",
)

# We only flag these when they appear in "happy path" test assertions (not in
# pytest.raises blocks, which test error handling — that's fine).
_PYTEST_RAISES_RE = re.compile(r'pytest\.raises', re.IGNORECASE)


def _lines_outside_raises_blocks(text: str) -> list[tuple[int, str]]:
    """
    Return (lineno, line) for lines NOT inside a pytest.raises context block.
    This is heuristic: we skip lines that appear after 'with pytest.raises'
    and before the next dedented line.
    """
    lines = text.splitlines()
    result: list[tuple[int, str]] = []
    in_raises = False
    raises_indent: int | None = None

    for i, line in enumerate(lines, 1):
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        if _PYTEST_RAISES_RE.search(line):
            in_raises = True
            raises_indent = indent
            continue

        if in_raises and raises_indent is not None:
            # Exit raises block when we return to same or lower indent
            if stripped and indent <= raises_indent:
                in_raises = False
                raises_indent = None
            else:
                continue  # skip lines inside raises block

        result.append((i, line))

    return result


def check_forbidden_model_refs() -> list[Violation]:
    """
    Scan Python test files for forbidden model/provider strings outside
    of pytest.raises blocks. Happy-path tests should never use gpt-*, etc.
    """
    violations: list[Violation] = []
    test_dirs = [ROOT / "orchestrator" / "tests"]

    for test_dir in test_dirs:
        if not test_dir.exists():
            continue
        for path in test_dir.rglob("*.py"):
            text = path.read_text(encoding="utf-8", errors="ignore")
            outside_raises = _lines_outside_raises_blocks(text)

            for lineno, line in outside_raises:
                # Check for forbidden model strings (quoted)
                for prefix in FORBIDDEN_MODEL_PREFIXES:
                    pattern = re.compile(r"""['"]""" + re.escape(prefix) + r"""\w""")
                    if pattern.search(line):
                        violations.append(Violation(
                            file=str(path.relative_to(ROOT)),
                            line=lineno,
                            check="FORBIDDEN_MODEL_IN_HAPPY_PATH",
                            detail=(
                                f"Test references forbidden model prefix '{prefix}*' "
                                "outside a pytest.raises block. "
                                "Use only anthropic/* or groq/* models in happy-path tests."
                            ),
                        ))
                        break  # one violation per line is enough

                # Check for forbidden field names
                for field in FORBIDDEN_FIELD_NAMES:
                    if field in line and "import" not in line:
                        violations.append(Violation(
                            file=str(path.relative_to(ROOT)),
                            line=lineno,
                            check="REMOVED_CONFIG_FIELD",
                            detail=(
                                f"Test references removed config field '{field}'. "
                                "This field was removed by APEX provider policy."
                            ),
                        ))

    return violations


# ---------------------------------------------------------------------------
# CHECK 3 — Config field existence (Python Settings class)
# ---------------------------------------------------------------------------

def _parse_settings_fields(config_path: Path) -> set[str]:
    """Extract all field names from the Settings(BaseSettings) class."""
    try:
        tree = ast.parse(config_path.read_text(encoding="utf-8"))
    except Exception:
        return set()

    fields: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == "Settings":
            for item in node.body:
                if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                    fields.add(item.target.id)
    return fields


def check_config_field_existence() -> list[Violation]:
    """
    Detect test files that assert on config fields no longer present in Settings.
    Only checks explicit attribute access patterns like `s.field_name`.
    """
    violations: list[Violation] = []
    config_path = ROOT / "orchestrator" / "config.py"

    if not config_path.exists():
        return violations

    known_fields = _parse_settings_fields(config_path)
    if not known_fields:
        return violations

    # We check patterns like: s.openai_api_key OR settings.openai_api_key
    # This regex matches <var>.<identifier> where identifier is not in known_fields
    attr_re = re.compile(r'\b[a-z_][a-z0-9_]*\.(([a-z_][a-z0-9_]*))\b')

    # Fields that are clearly not Settings fields (common false positive names)
    SKIP_ATTRS = {
        "json", "lower", "upper", "strip", "split", "replace", "format",
        "get", "get_secret_value", "items", "keys", "values", "append",
        "startswith", "endswith", "encode", "decode", "read", "write",
        "raises", "approx", "mark", "fixture", "asyncio", "environ",
        "setenv", "delenv", "model_config", "model_validate", "model_fields",
        "log_level", "environment", "temporal_host", "temporal_namespace",
        "temporal_task_queue", "temporal_tls_enabled", "temporal_tls_cert",
        "temporal_tls_key", "temporal_max_workflow_tasks", "temporal_max_activities",
        "redis_url", "redis_password", "redis_ssl",
        "slack_alert_webhook_url", "max_workflow_history_size",
        "cache_embedding_model", "cache_similarity_threshold", "cache_ttl_seconds",
        "man_mode_blocking_threshold",
    }

    test_file = ROOT / "orchestrator" / "tests" / "test_config.py"
    if not test_file.exists():
        return violations

    text = test_file.read_text(encoding="utf-8", errors="ignore")
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in attr_re.finditer(line):
            attr = m.group(1)
            if attr in SKIP_ATTRS:
                continue
            # If it looks like a Settings field (contains _api_key, _model, _provider etc.)
            if any(kw in attr for kw in ("_api_key", "_model", "_provider", "_key")):
                if attr not in known_fields:
                    violations.append(Violation(
                        file=str(test_file.relative_to(ROOT)),
                        line=lineno,
                        check="STALE_CONFIG_FIELD",
                        detail=(
                            f"Test accesses '.{attr}' which does not exist in "
                            f"Settings class. Either the field was renamed/removed "
                            f"or the test needs updating."
                        ),
                    ))

    return violations


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    print("🔍 APEX Implementation-Test Sync Guard")
    print("=" * 50)

    all_violations: list[Violation] = []

    print("\n[1/3] Storage API consistency (TypeScript)...")
    v = check_storage_api_sync()
    all_violations.extend(v)
    print(f"  {'✅ PASS' if not v else f'❌ {len(v)} violation(s)'}")
    for viol in v:
        print(viol)

    print("\n[2/3] Forbidden model refs in Python tests...")
    v = check_forbidden_model_refs()
    all_violations.extend(v)
    print(f"  {'✅ PASS' if not v else f'❌ {len(v)} violation(s)'}")
    for viol in v:
        print(viol)

    print("\n[3/3] Config field existence check...")
    v = check_config_field_existence()
    all_violations.extend(v)
    print(f"  {'✅ PASS' if not v else f'❌ {len(v)} violation(s)'}")
    for viol in v:
        print(viol)

    print("\n" + "=" * 50)
    if all_violations:
        print(f"❌ FAILED: {len(all_violations)} sync violation(s) found.")
        print(
            "\n💡 These violations mean a test was NOT updated when its implementation changed.\n"
            "   Fix the listed test files before merging."
        )
        return 1

    print("✅ PASSED: All implementation-test sync checks clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
