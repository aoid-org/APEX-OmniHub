#!/usr/bin/env python3
"""
APEX Skill Forge v8.0 — 12-Dimension Audit Validator
Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.

Validates skill packages against the APEX 12-Dimension Quality Standard.
Each dimension scored 0-10; aggregate average must be >= 9.5.

Usage:
    python audit.py <skill-path> [--verbose] [--threshold 9.5]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

VERSION = "8.0.0"
COPYRIGHT = "Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved."
DEFAULT_THRESHOLD = 9.5


# ---------------------------------------------------------------------------
# Dimension Validators
# ---------------------------------------------------------------------------
def _d01_manifest_completeness(skill_path: Path) -> tuple[float, str]:
    """D1: Manifest completeness — name, version, archetype, description, dag metadata."""
    manifest_path = skill_path / "MANIFEST.json"
    if not manifest_path.exists():
        return 0.0, "MANIFEST.json not found"

    try:
        m = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return 0.0, f"Invalid JSON: {e}"

    required_root = ["name", "version", "archetype", "description"]
    required_dag = [
        "node_type",
        "accepts",
        "emits",
        "timeout_ms",
        "retry_policy",
        "idempotent",
        "side_effects",
    ]

    missing_root = [k for k in required_root if k not in m]
    dag = m.get("dag", {})
    missing_dag = [k for k in required_dag if k not in dag]

    total_fields = len(required_root) + len(required_dag)
    present = total_fields - len(missing_root) - len(missing_dag)
    score = (present / total_fields) * 10

    issues = []
    if missing_root:
        issues.append(f"Missing root: {missing_root}")
    if missing_dag:
        issues.append(f"Missing dag: {missing_dag}")

    # Bonus for omnihub_compatible
    if dag.get("omnihub_compatible"):
        score = min(10.0, score + 0.5)

    return round(score, 1), "; ".join(issues) if issues else "Complete"


def _d02_trigger_clarity(skill_path: Path) -> tuple[float, str]:
    """D2: Trigger clarity — 3+ specific trigger phrases in description."""
    manifest_path = skill_path / "MANIFEST.json"
    if not manifest_path.exists():
        return 0.0, "No MANIFEST.json"

    m = json.loads(manifest_path.read_text(encoding="utf-8"))
    desc = m.get("description", "")

    # Count trigger-like phrases
    trigger_patterns = re.findall(
        r"(?:trigger|invoke|run|execute|activate)\s*[:=]?\s*\w+", desc, re.IGNORECASE
    )
    comma_phrases = [p.strip() for p in desc.split(",") if p.strip()]

    trigger_count = max(len(trigger_patterns), len(comma_phrases))

    if trigger_count >= 5:
        return 10.0, f"{trigger_count} trigger phrases found"
    if trigger_count >= 3:
        return 9.0 + (trigger_count - 3) * 0.5, f"{trigger_count} trigger phrases"
    if trigger_count >= 1:
        return 6.0 + trigger_count, f"Only {trigger_count} trigger phrase(s)"
    return 3.0, "No trigger phrases"


def _d03_io_schema(skill_path: Path) -> tuple[float, str]:
    """D3: Input/output schema definition."""
    # Check README.md or SKILL.md for I/O spec
    for doc_name in ["README.md", "SKILL.md"]:
        doc_path = skill_path / doc_name
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8")
            has_input = bool(re.search(r"\*\*Input\*\*", content))
            has_output = bool(re.search(r"\*\*Output\*\*", content))
            has_success = bool(re.search(r"\*\*Success\*\*", content))

            score = 4.0
            if has_input:
                score += 2.0
            if has_output:
                score += 2.0
            if has_success:
                score += 2.0

            # Check executor for typed signature
            executor_path = skill_path / "scripts" / "executor.py"
            if executor_path.exists():
                exec_content = executor_path.read_text(encoding="utf-8")
                if "input_context: dict" in exec_content or "input_context: Dict" in exec_content:
                    score = min(10.0, score + 1.0)

            parts = []
            if not has_input:
                parts.append("Missing **Input**")
            if not has_output:
                parts.append("Missing **Output**")
            if not has_success:
                parts.append("Missing **Success**")

            return round(min(10.0, score), 1), "; ".join(parts) if parts else "Complete"

    return 0.0, "No README.md or SKILL.md"


def _d04_execution_paths(skill_path: Path) -> tuple[float, str]:
    """D4: Execution path documentation — decision trees."""
    for doc_name in ["README.md", "SKILL.md"]:
        doc_path = skill_path / doc_name
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8")
            has_tree = "├─" in content or "├" in content or "Decision Tree" in content
            has_flow = "→" in content or "->" in content
            has_sections = content.count("##") >= 3

            score = 5.0
            if has_tree:
                score += 2.5
            if has_flow:
                score += 1.5
            if has_sections:
                score += 1.0
            return round(
                min(10.0, score), 1
            ), "OK" if score >= 9.0 else "Could add more decision trees"

    return 0.0, "No documentation"


def _d05_anti_hallucination(skill_path: Path) -> tuple[float, str]:
    """D5: Anti-hallucination guards — NEVER/ALWAYS rules."""
    for doc_name in ["README.md", "SKILL.md"]:
        doc_path = skill_path / doc_name
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8")
            never_count = len(re.findall(r"\bNEVER\b", content))
            always_count = len(re.findall(r"\bALWAYS\b", content))
            total = never_count + always_count

            if total >= 6:
                return 10.0, f"{never_count} NEVER + {always_count} ALWAYS rules"
            if total >= 3:
                return 9.0, f"{total} rules (suggest 6+)"
            if total >= 1:
                return 7.0, f"Only {total} rule(s)"
            return 5.0, "No NEVER/ALWAYS rules"

    return 0.0, "No documentation"


def _d06_usage_examples(skill_path: Path) -> tuple[float, str]:
    """D6: Usage examples — Python import + CLI wrapper."""
    for doc_name in ["README.md", "SKILL.md"]:
        doc_path = skill_path / doc_name
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8")
            has_python = "```python" in content or "```py" in content
            has_cli = "```bash" in content or "```shell" in content
            has_import = "import" in content

            score = 5.0
            if has_python:
                score += 2.0
            if has_cli:
                score += 1.5
            if has_import:
                score += 1.5
            return round(min(10.0, score), 1), "OK" if score >= 9.0 else "Add more examples"

    return 0.0, "No documentation"


def _d07_failure_modes(skill_path: Path) -> tuple[float, str]:
    """D7: Failure mode handling — explicit error scenarios."""
    for doc_name in ["README.md", "SKILL.md"]:
        doc_path = skill_path / doc_name
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8")
            has_troubleshooting = "Troubleshooting" in content or "troubleshoot" in content.lower()
            has_error_table = "Symptom" in content and "Fix" in content
            has_fails = "Fails When" in content or "Fails when" in content or "[X]" in content

            score = 5.0
            if has_troubleshooting:
                score += 2.0
            if has_error_table:
                score += 2.0
            if has_fails:
                score += 1.0
            return round(min(10.0, score), 1), "OK" if score >= 9.0 else "Expand failure docs"

    return 0.0, "No documentation"


def _d08_dag_compatibility(skill_path: Path) -> tuple[float, str]:
    """D8: DAG compatibility — idempotency, timeout, retry policy."""
    manifest_path = skill_path / "MANIFEST.json"
    if not manifest_path.exists():
        return 0.0, "No MANIFEST.json"

    m = json.loads(manifest_path.read_text(encoding="utf-8"))
    dag = m.get("dag", {})

    checks = {
        "timeout_ms": "timeout_ms" in dag,
        "retry_policy": "retry_policy" in dag and "max" in dag.get("retry_policy", {}),
        "idempotent": "idempotent" in dag,
        "node_type": "node_type" in dag,
        "emits": "emits" in dag,
    }

    passed = sum(checks.values())
    score = (passed / len(checks)) * 10

    failed = [k for k, v in checks.items() if not v]
    return round(score, 1), f"Missing: {failed}" if failed else "Full DAG compliance"


def _d09_script_determinism(skill_path: Path) -> tuple[float, str]:
    """D9: Script determinism — executor.py has single entry point."""
    executor_path = skill_path / "scripts" / "executor.py"
    if not executor_path.exists():
        return 0.0, "scripts/executor.py not found"

    content = executor_path.read_text(encoding="utf-8")
    has_execute = "def execute(" in content
    has_main = 'if __name__ == "__main__"' in content or "if __name__ == '__main__'" in content
    has_return_dict = "-> dict" in content or "-> Dict" in content

    score = 4.0
    if has_execute:
        score += 3.0
    if has_main:
        score += 1.5
    if has_return_dict:
        score += 1.5
    return round(min(10.0, score), 1), "OK" if score >= 9.0 else "Missing execute() or __main__"


def _d10_dependencies(skill_path: Path) -> tuple[float, str]:
    """D10: Dependencies declared — requirements.txt or inline."""
    has_reqs = (skill_path / "requirements.txt").exists()
    has_pyproject = (skill_path / "pyproject.toml").exists()

    # Check if executor has inline dependency docs
    executor_path = skill_path / "scripts" / "executor.py"
    has_inline = False
    if executor_path.exists():
        content = executor_path.read_text(encoding="utf-8")
        # stdlib-only is explicitly fine — check for comment stating so
        has_inline = "stdlib" in content.lower() or "no external" in content.lower()
        # If only stdlib imports, it's fine
        non_stdlib = [
            line
            for line in content.split("\n")
            if line.startswith("import ") or line.startswith("from ")
            if not any(
                mod in line
                for mod in [
                    "json",
                    "os",
                    "sys",
                    "time",
                    "pathlib",
                    "typing",
                    "re",
                    "hashlib",
                    "signal",
                    "datetime",
                    "textwrap",
                    "argparse",
                    "shutil",
                    "zipfile",
                    "inspect",
                    "copy",
                    "io",
                    "collections",
                    "__future__",
                ]
            )
        ]
        if not non_stdlib:
            has_inline = True  # All stdlib — no requirements needed

    if has_reqs or has_pyproject:
        return 10.0, "requirements.txt or pyproject.toml present"
    if has_inline:
        return 10.0, "stdlib-only (no external deps needed)"
    return 6.0, "No dependency declaration"


def _d11_license_copyright(skill_path: Path) -> tuple[float, str]:
    """D11: License + copyright present."""
    has_license = any(
        (skill_path / name).exists() for name in ["LICENSE", "LICENSE.md", "LICENSE.txt"]
    )

    # Check for copyright in any doc
    copyright_found = False
    for doc in skill_path.rglob("*.md"):
        if "Copyright" in doc.read_text(encoding="utf-8"):
            copyright_found = True
            break
    for doc in skill_path.rglob("*.py"):
        if "Copyright" in doc.read_text(encoding="utf-8"):
            copyright_found = True
            break

    score = 5.0
    if has_license:
        score += 3.0
    if copyright_found:
        score += 2.0
    return round(
        min(10.0, score), 1
    ), "OK" if score >= 9.0 else "Add LICENSE file and/or copyright notices"


def _d12_versioning(skill_path: Path) -> tuple[float, str]:
    """D12: Versioning — semantic ver x.y.z."""
    manifest_path = skill_path / "MANIFEST.json"
    if not manifest_path.exists():
        return 0.0, "No MANIFEST.json"

    m = json.loads(manifest_path.read_text(encoding="utf-8"))
    version = m.get("version", "")

    if re.match(r"^\d+\.\d+\.\d+$", version):
        return 10.0, f"Valid semver: {version}"
    if re.match(r"^\d+\.\d+", version):
        return 7.0, f"Partial version: {version}"
    return 3.0, f"Invalid version: {version}"


# ---------------------------------------------------------------------------
# Audit Engine
# ---------------------------------------------------------------------------
DIMENSIONS = [
    ("1. Manifest completeness", _d01_manifest_completeness),
    ("2. Trigger clarity", _d02_trigger_clarity),
    ("3. Input/output schema", _d03_io_schema),
    ("4. Execution paths", _d04_execution_paths),
    ("5. Anti-hallucination", _d05_anti_hallucination),
    ("6. Usage examples", _d06_usage_examples),
    ("7. Failure modes", _d07_failure_modes),
    ("8. DAG compatibility", _d08_dag_compatibility),
    ("9. Script determinism", _d09_script_determinism),
    ("10. Dependencies", _d10_dependencies),
    ("11. License/copyright", _d11_license_copyright),
    ("12. Versioning", _d12_versioning),
]


def audit_skill(skill_path: Path, threshold: float = DEFAULT_THRESHOLD) -> dict[str, Any]:
    """
    Run 12-dimension audit on a skill directory.

    Returns JSON report with per-dimension scores and pass/fail status.
    """
    if not skill_path.is_dir():
        return {"error": f"Not a directory: {skill_path}", "passed": False}

    results = []
    total = 0.0

    for name, validator in DIMENSIONS:
        score, detail = validator(skill_path)
        results.append({"dimension": name, "score": score, "detail": detail})
        total += score

    average = round(total / len(DIMENSIONS), 2)
    passed = average >= threshold

    return {
        "skill_path": str(skill_path),
        "dimensions": results,
        "average_score": average,
        "threshold": threshold,
        "passed": passed,
        "verdict": "PASS" if passed else f"FAIL (need {threshold}, got {average})",
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        prog="audit",
        description=f"APEX 12-Dimension Audit Validator v{VERSION}",
        epilog=COPYRIGHT,
    )
    parser.add_argument("skill_path", type=Path, help="Path to skill directory")
    parser.add_argument(
        "--threshold", type=float, default=DEFAULT_THRESHOLD, help="Pass threshold (default: 9.5)"
    )
    parser.add_argument("--verbose", action="store_true", help="Print detailed output")
    args = parser.parse_args()

    report = audit_skill(args.skill_path, args.threshold)

    if args.verbose:
        print(f"\n{'=' * 60}")
        print(f"  APEX 12-Dimension Audit — {args.skill_path.name}")
        print(f"{'=' * 60}\n")
        for dim in report.get("dimensions", []):
            status = "[OK]" if dim["score"] >= 9.0 else "[!!]" if dim["score"] >= 7.0 else "[FAIL]"
            print(f"  {status} {dim['dimension']}: {dim['score']}/10 — {dim['detail']}")
        print(f"\n  {'─' * 50}")
        print(f"  AVERAGE: {report['average_score']}/10 (threshold: {report['threshold']})")
        print(f"  VERDICT: {report['verdict']}")
        print()
    else:
        print(json.dumps(report, indent=2))

    sys.exit(0 if report.get("passed") else 1)


if __name__ == "__main__":
    main()
