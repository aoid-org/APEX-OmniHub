#!/usr/bin/env python3
"""
APEX Skill Forge v8.0 -- Comprehensive Test Suite
Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.

Tests the complete forge -> audit -> ship -> execute pipeline
across all 6 archetypes plus edge cases.

Usage:
    python test_forge_full.py
"""

from __future__ import annotations

import json
import math
import shutil
import sys
import tempfile
import traceback
import zipfile
from pathlib import Path

# Add scripts to path
FORGE_ROOT = Path(__file__).parent / ".claude" / "skills" / "apex-skill-forge-v8"
sys.path.insert(0, str(FORGE_ROOT / "scripts"))

from audit import audit_skill  # noqa: E402
from forge import VALID_ARCHETYPES, create_skill  # noqa: E402
from ship import package_skill  # noqa: E402

# ---------------------------------------------------------------------------
# Test Infrastructure
# ---------------------------------------------------------------------------
PASS_COUNT = 0
FAIL_COUNT = 0
RESULTS: list[dict] = []


def log(msg: str) -> None:
    print(msg)


def test(name: str, passed: bool, detail: str = "") -> None:
    global PASS_COUNT, FAIL_COUNT
    status = "[PASS]" if passed else "[FAIL]"
    suffix = f" -- {detail}" if detail else ""
    log(f"  {status} | {name}{suffix}")
    RESULTS.append({"test": name, "passed": passed, "detail": detail})
    if passed:
        PASS_COUNT += 1
    else:
        FAIL_COUNT += 1


# ---------------------------------------------------------------------------
# Test 1: Forge all 6 archetypes
# ---------------------------------------------------------------------------
def test_forge_all_archetypes(tmp: Path) -> dict[str, Path]:
    log("\n" + "=" * 60)
    log("  TEST GROUP 1: Forge all 6 archetypes")
    log("=" * 60)

    skills: dict[str, Path] = {}
    for arch in VALID_ARCHETYPES:
        name = f"test-{arch}"
        output = tmp / "forged"
        try:
            result = create_skill(name, arch, output)
            skill_path = output / name
            exists = skill_path.is_dir()
            has_manifest = (skill_path / "MANIFEST.json").exists()
            has_readme = (skill_path / "README.md").exists()
            has_executor = (skill_path / "scripts" / "executor.py").exists()
            has_license = (skill_path / "LICENSE").exists()

            all_ok = (
                result and exists and has_manifest and has_readme and has_executor and has_license
            )
            parts = (
                f"dir={exists} manifest={has_manifest} "
                f"readme={has_readme} executor={has_executor} "
                f"license={has_license}"
            )
            test(f"forge {arch}", all_ok, parts)
            if all_ok:
                skills[arch] = skill_path
        except Exception as e:
            test(f"forge {arch}", False, f"Exception: {e}")

    return skills


# ---------------------------------------------------------------------------
# Test 2: Audit all forged skills
# ---------------------------------------------------------------------------
def test_audit_all(skills: dict[str, Path]) -> None:
    log("\n" + "=" * 60)
    log("  TEST GROUP 2: Audit all forged skills (threshold 9.5)")
    log("=" * 60)

    for arch, skill_path in skills.items():
        try:
            report = audit_skill(skill_path)
            avg = report.get("average_score", 0)
            passed = report.get("passed", False)

            weak = [d for d in report.get("dimensions", []) if d["score"] < 9.5]
            weak_str = "; ".join(f"{d['dimension']}={d['score']}" for d in weak) if weak else ""

            detail = f"score={avg}/10"
            if weak_str:
                detail += f" [weak: {weak_str}]"
            else:
                detail += " [all perfect]"
            test(f"audit {arch}", passed, detail)
        except Exception as e:
            test(f"audit {arch}", False, f"Exception: {e}")


# ---------------------------------------------------------------------------
# Helper: Validate ZIP structure
# ---------------------------------------------------------------------------
def _validate_zip_structure(fmt: str, names: list[str], root: str) -> bool:
    """Validate ZIP contains required files for given format."""
    if fmt == "claude":
        return f"{root}/SKILL.md" in names and f"{root}/manifest.yaml" in names
    # universal and omnihub have identical requirements
    return f"{root}/README.md" in names and f"{root}/MANIFEST.json" in names


def _test_single_package(arch: str, skill_path: Path, fmt: str, tmp: Path) -> None:
    """Test shipping a single archetype in a single format."""
    try:
        output_dir = tmp / "packages" / arch
        zip_path = package_skill(skill_path, fmt, output_dir)
        exists = zip_path.exists()
        size = zip_path.stat().st_size if exists else 0

        valid_structure = False
        if exists:
            with zipfile.ZipFile(zip_path, "r") as zf:
                names = zf.namelist()
                root = names[0].split("/")[0] if names else ""
                valid_structure = _validate_zip_structure(fmt, names, root)

        ok = exists and valid_structure and size > 0
        label = "valid" if valid_structure else "INVALID"
        test(
            f"ship {arch} -> {fmt}",
            ok,
            f"size={size:,}B structure={label}",
        )
    except Exception as e:
        test(
            f"ship {arch} -> {fmt}",
            False,
            f"Exception: {e}",
        )


# ---------------------------------------------------------------------------
# Test 3: Ship all 3 formats for each archetype
# ---------------------------------------------------------------------------
def test_ship_all(skills: dict[str, Path], tmp: Path) -> None:
    log("\n" + "=" * 60)
    log("  TEST GROUP 3: Ship all 3 formats (claude/universal/omnihub)")
    log("=" * 60)

    for arch, skill_path in skills.items():
        for fmt in ["claude", "universal", "omnihub"]:
            _test_single_package(arch, skill_path, fmt, tmp)


# ---------------------------------------------------------------------------
# Test 4: Execute each forged skill
# ---------------------------------------------------------------------------
def test_execute_all(skills: dict[str, Path]) -> None:
    log("\n" + "=" * 60)
    log("  TEST GROUP 4: Execute each forged skill")
    log("=" * 60)

    for arch, skill_path in skills.items():
        try:
            executor_path = skill_path / "scripts" / "executor.py"
            exec_globals: dict = {}
            exec(  # noqa: S102
                executor_path.read_text(encoding="utf-8"),
                exec_globals,
            )

            execute_fn = exec_globals.get("execute")
            if execute_fn is None:
                test(
                    f"execute {arch}",
                    False,
                    "No execute() function found",
                )
                continue

            result = execute_fn(
                {
                    "execution_id": f"test-{arch}-001",
                    "parameters": {
                        "test": True,
                        "archetype": arch,
                    },
                    "context": {},
                    "metadata": {},
                }
            )

            has_result = "result" in result
            has_context = "context_updates" in result
            has_metadata = "metadata" in result
            status = result.get("metadata", {}).get("node_status", "")
            exec_time = result.get("metadata", {}).get("execution_time_ms", -1)
            skill_name = result.get("result", {}).get("skill", "")

            all_ok = (
                has_result
                and has_context
                and has_metadata
                and status == "success"
                and exec_time >= 0
            )
            test(
                f"execute {arch}",
                all_ok,
                f"status={status} time={exec_time}ms skill={skill_name}",
            )
        except Exception as e:
            test(f"execute {arch}", False, f"Exception: {e}")


# ---------------------------------------------------------------------------
# Test 5: Manifest DAG metadata validation
# ---------------------------------------------------------------------------
def test_manifest_dag(skills: dict[str, Path]) -> None:
    log("\n" + "=" * 60)
    log("  TEST GROUP 5: Validate MANIFEST.json DAG metadata")
    log("=" * 60)

    required_dag_keys = [
        "node_type",
        "accepts",
        "emits",
        "timeout_ms",
        "retry_policy",
        "idempotent",
        "side_effects",
        "omnihub_compatible",
    ]

    from forge import ARCHETYPE_NODE_TYPES  # noqa: E402

    for arch, skill_path in skills.items():
        try:
            raw = (skill_path / "MANIFEST.json").read_text(encoding="utf-8")
            manifest = json.loads(raw)
            dag = manifest.get("dag", {})
            missing = [k for k in required_dag_keys if k not in dag]

            type_ok = (
                isinstance(dag.get("timeout_ms"), int)
                and isinstance(dag.get("retry_policy"), dict)
                and isinstance(dag.get("idempotent"), bool)
                and isinstance(dag.get("omnihub_compatible"), bool)
                and isinstance(dag.get("accepts"), list)
                and isinstance(dag.get("emits"), list)
            )

            expected_node = ARCHETYPE_NODE_TYPES.get(arch, "processor")
            node_match = dag.get("node_type") == expected_node

            all_ok = len(missing) == 0 and type_ok and node_match
            detail = (
                f"missing={missing or 'none'} "
                f"types={'ok' if type_ok else 'BAD'} "
                f"node={dag.get('node_type')}=={expected_node}"
            )
            test(f"manifest DAG {arch}", all_ok, detail)
        except Exception as e:
            test(
                f"manifest DAG {arch}",
                False,
                f"Exception: {e}",
            )


# ---------------------------------------------------------------------------
# Test 6: Edge cases
# ---------------------------------------------------------------------------
def test_edge_cases(tmp: Path) -> None:
    log("\n" + "=" * 60)
    log("  TEST GROUP 6: Edge cases & error handling")
    log("=" * 60)

    edge_dir = tmp / "edge"

    result = create_skill("Bad-Name", "workflow", edge_dir)
    test("reject uppercase name", result is False)

    result = create_skill("bad name", "workflow", edge_dir)
    test("reject name with spaces", result is False)

    result = create_skill("bad_name", "workflow", edge_dir)
    test("reject underscored name", result is False)

    result = create_skill("good-name", "invalid-arch", edge_dir)
    test("reject invalid archetype", result is False)

    result = create_skill("simple", "workflow", edge_dir)
    test("accept single-word name", result is True)

    result = create_skill("v2-alpha-3", "toolkit", edge_dir)
    test("accept alphanumeric name", result is True)

    report = audit_skill(tmp / "nonexistent")
    test(
        "audit non-existent path",
        report.get("passed") is False,
    )

    try:
        package_skill(tmp / "nonexistent", "claude")
        test(
            "ship non-existent path",
            False,
            "should have raised error",
        )
    except Exception:
        test(
            "ship non-existent path",
            True,
            "correctly raised error",
        )

    try:
        package_skill(edge_dir / "simple", "invalid_format")
        test(
            "ship invalid format",
            False,
            "should have raised error",
        )
    except Exception:
        test(
            "ship invalid format",
            True,
            "correctly raised error",
        )


# ---------------------------------------------------------------------------
# Test 7: Self-audit the forge itself
# ---------------------------------------------------------------------------
def test_self_audit() -> None:
    log("\n" + "=" * 60)
    log("  TEST GROUP 7: Forge self-audit")
    log("=" * 60)

    report = audit_skill(FORGE_ROOT)
    avg = report.get("average_score", 0)
    passed = report.get("passed", False)
    test("self-audit >= 9.5", passed, f"score={avg}/10")
    test("self-audit == 10.0", math.isclose(avg, 10.0, abs_tol=0.01), f"score={avg}/10")

    for dim in report.get("dimensions", []):
        test(
            f"self {dim['dimension']}",
            dim["score"] >= 9.5,
            f"{dim['score']}/10 -- {dim['detail']}",
        )


# ---------------------------------------------------------------------------
# Test 8: Claude ZIP SKILL.md line count
# ---------------------------------------------------------------------------
def test_skill_md_line_limit() -> None:
    log("\n" + "=" * 60)
    log("  TEST GROUP 8: SKILL.md line limit (< 500)")
    log("=" * 60)

    skill_md = FORGE_ROOT / "SKILL.md"
    if skill_md.exists():
        lines = len(skill_md.read_text(encoding="utf-8").splitlines())
        test("SKILL.md < 500 lines", lines < 500, f"{lines} lines")
    else:
        test("SKILL.md exists", False, "file not found")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    global PASS_COUNT, FAIL_COUNT

    log("\n" + "=" * 60)
    log("  APEX SKILL FORGE v8.0 -- COMPREHENSIVE TEST SUITE")
    log("=" * 60)

    tmp = Path(tempfile.mkdtemp(prefix="forge-test-"))
    log(f"  Temp dir: {tmp}\n")

    try:
        skills = test_forge_all_archetypes(tmp)
        test_audit_all(skills)
        test_ship_all(skills, tmp)
        test_execute_all(skills)
        test_manifest_dag(skills)
        test_edge_cases(tmp)
        test_self_audit()
        test_skill_md_line_limit()

    except Exception as e:
        log(f"\n[CRASH] UNHANDLED EXCEPTION: {e}")
        traceback.print_exc()

    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # Summary
    total = PASS_COUNT + FAIL_COUNT
    log("\n" + "=" * 60)
    log(f"  SUMMARY: {PASS_COUNT}/{total} passed, {FAIL_COUNT} failed")
    if FAIL_COUNT == 0:
        log("  ALL TESTS PASSED")
    else:
        log("  FAILURES DETECTED:")
        for r in RESULTS:
            if not r["passed"]:
                log(f"     [FAIL] {r['test']}: {r['detail']}")
    log("=" * 60 + "\n")

    # Write JSON report
    report_path = FORGE_ROOT / "test_results.json"
    report = {
        "total": total,
        "passed": PASS_COUNT,
        "failed": FAIL_COUNT,
        "pass_rate": (f"{PASS_COUNT / total * 100:.1f}%" if total > 0 else "N/A"),
        "results": RESULTS,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    log(f"  Report saved: {report_path}\n")

    sys.exit(0 if FAIL_COUNT == 0 else 1)


if __name__ == "__main__":
    main()
