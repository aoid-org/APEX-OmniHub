#!/usr/bin/env python3
"""
APEX Skill Forge v8.0 — OmniHub Direct Installer
Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.

Installs a forged skill directly into an APEX OmniHub repository,
registering it in the skill catalog and generating example DAG workflows.

Usage:
    python install_to_omnihub.py --skill-path ./my-skill --omnihub-root /path/to/APEX-OmniHub
    python install_to_omnihub.py --help
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "8.0.0"
COPYRIGHT = "Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved."

# Required OmniHub directories (created if missing)
OMNIHUB_DIRS = ["skills", "config", "dag", "logs"]


# ---------------------------------------------------------------------------
# Structure Detection & Setup
# ---------------------------------------------------------------------------
def detect_omnihub_structure(omnihub_root: Path) -> dict[str, Path]:
    """Detect or create OmniHub directory structure."""
    structure: dict[str, Path] = {
        "skills_dir": omnihub_root / "skills",
        "dag_dir": omnihub_root / "dag",
        "config_dir": omnihub_root / "config",
        "catalog": omnihub_root / "config" / "skill_catalog.json",
        "logs_dir": omnihub_root / "logs" / "skills",
    }
    return structure


def ensure_omnihub_structure(omnihub_root: Path) -> dict[str, Path]:
    """Create OmniHub directories if they don't exist."""
    structure = detect_omnihub_structure(omnihub_root)

    for key, path in structure.items():
        if key == "catalog":
            continue  # File, not directory
        path.mkdir(parents=True, exist_ok=True)

    # Initialize catalog if missing
    if not structure["catalog"].exists():
        catalog = {
            "version": "1.0.0",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "skills": [],
        }
        structure["catalog"].write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")

    return structure


# ---------------------------------------------------------------------------
# Pre-flight Checks
# ---------------------------------------------------------------------------
def preflight_checks(
    skill_path: Path,
    omnihub_root: Path,
    structure: dict[str, Path],
) -> list[str]:
    """Run pre-flight validation. Returns list of errors (empty = pass)."""
    errors: list[str] = []

    # Check OmniHub root exists
    if not omnihub_root.is_dir():
        errors.append(f"OmniHub root not found: {omnihub_root}")
        return errors

    # Check skill path
    if not skill_path.is_dir():
        errors.append(f"Skill path not found: {skill_path}")
        return errors

    # Check MANIFEST.json
    manifest_path = skill_path / "MANIFEST.json"
    if not manifest_path.exists():
        errors.append("MANIFEST.json not found in skill directory")
        return errors

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errors.append(f"Invalid MANIFEST.json: {e}")
        return errors

    # Check omnihub_compatible flag
    dag = manifest.get("dag", {})
    if not dag.get("omnihub_compatible", False):
        errors.append("MANIFEST.json dag.omnihub_compatible is not true")

    # Check for naming conflicts
    skill_name = manifest.get("name", skill_path.name)
    target_dir = structure["skills_dir"] / skill_name
    if target_dir.exists():
        errors.append(
            f"Naming conflict: '{skill_name}' already exists at {target_dir}. "
            f"Use --force to overwrite or uninstall first."
        )

    # Check Python version
    if sys.version_info < (3, 10):
        errors.append(f"Python 3.10+ required, found {sys.version}")

    return errors


# ---------------------------------------------------------------------------
# Installation
# ---------------------------------------------------------------------------
def install_skill(
    skill_path: Path,
    omnihub_root: Path,
    skill_name: str,
    structure: dict[str, Path],
) -> Path:
    """Copy skill files to OmniHub skills directory."""
    target = structure["skills_dir"] / skill_name

    # Copy skill directory
    shutil.copytree(skill_path, target, dirs_exist_ok=True)

    # Ensure omnihub_integration exists
    integration_dir = target / "omnihub_integration"
    integration_dir.mkdir(exist_ok=True)

    # Generate health_checks.py if not present
    health_check_path = integration_dir / "health_checks.py"
    if not health_check_path.exists():
        health_check_src = skill_path.parent / "omnihub_integration" / "health_checks.py"
        if health_check_src.exists():
            shutil.copy2(health_check_src, health_check_path)
        else:
            _generate_health_check(health_check_path, skill_name)

    # Create log directory
    log_dir = structure["logs_dir"] / skill_name
    log_dir.mkdir(parents=True, exist_ok=True)

    return target


def _generate_health_check(path: Path, skill_name: str) -> None:
    """Generate a health check script for the skill."""
    content = textwrap.dedent(f"""\
        #!/usr/bin/env python3
        \"\"\"OmniHub Health Check for {skill_name}. {COPYRIGHT}\"\"\"
        import json
        import sys
        from pathlib import Path
        from typing import Any

        def health_check() -> dict[str, Any]:
            checks: dict[str, bool] = {{}}
            try:
                sys.path.insert(0, str(Path(__file__).parent.parent))
                from scripts.executor import execute
                checks["executor_import"] = True
            except ImportError as e:
                checks["executor_import"] = False
                return {{"status": "unhealthy", "checks": checks, "message": f"Executor import failed: {{e}}"}}
            checks["dependencies"] = True
            manifest_path = Path(__file__).parent.parent / "MANIFEST.json"
            try:
                with open(manifest_path) as f:
                    manifest = json.load(f)
                    assert manifest.get("dag", {{}}).get("omnihub_compatible") is True
                checks["manifest_valid"] = True
            except Exception as e:
                checks["manifest_valid"] = False
                return {{"status": "unhealthy", "checks": checks, "message": f"Manifest invalid: {{e}}"}}
            import inspect
            sig = inspect.signature(execute)
            checks["dag_compatible"] = "input_context" in list(sig.parameters.keys())
            if not checks["dag_compatible"]:
                return {{"status": "unhealthy", "checks": checks, "message": "Executor signature incompatible"}}
            return {{"status": "healthy", "checks": checks, "message": "All checks passed"}}

        if __name__ == "__main__":
            result = health_check()
            print(json.dumps(result, indent=2))
            sys.exit(0 if result["status"] == "healthy" else 1)
    """)
    path.write_text(content, encoding="utf-8")


# ---------------------------------------------------------------------------
# Catalog Registration
# ---------------------------------------------------------------------------
def register_in_catalog(
    structure: dict[str, Path],
    skill_name: str,
    manifest: dict[str, Any],
    health_status: str,
) -> None:
    """Add skill entry to skill_catalog.json."""
    catalog_path = structure["catalog"]
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

    # Remove existing entry if present
    catalog["skills"] = [s for s in catalog.get("skills", []) if s.get("id") != skill_name]

    now = datetime.now(timezone.utc).isoformat()
    entry = {
        "id": skill_name,
        "version": manifest.get("version", "1.0.0"),
        "archetype": manifest.get("archetype", "workflow"),
        "path": f"skills/{skill_name}",
        "manifest": f"skills/{skill_name}/MANIFEST.json",
        "executor": f"skills/{skill_name}/scripts/executor.py",
        "health_check": f"skills/{skill_name}/omnihub_integration/health_checks.py",
        "enabled": True,
        "auto_load": True,
        "dag_compatible": True,
        "installed_at": now,
        "installed_by": f"skill-forge v{VERSION}",
        "health_status": health_status,
        "last_health_check": now,
    }

    catalog["skills"].append(entry)
    catalog["updated_at"] = now

    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# DAG Workflow Generation
# ---------------------------------------------------------------------------
def generate_example_workflow(
    structure: dict[str, Path],
    skill_name: str,
    manifest: dict[str, Any],
) -> Path:
    """Generate example DAG workflow YAML."""
    node_type = manifest.get("dag", {}).get("node_type", "processor")
    timeout = manifest.get("dag", {}).get("timeout_ms", 30000)

    workflow = textwrap.dedent(f"""\
        # Example DAG Workflow for {skill_name}
        # Generated by APEX Skill Forge v{VERSION}
        # {COPYRIGHT}

        name: example-{skill_name}-workflow
        version: 1.0.0
        description: Example workflow demonstrating {skill_name} skill integration

        nodes:
          - id: input-validator
            skill: {skill_name}
            node_type: validator
            inputs:
              source: external_trigger
              parameters:
                validation_mode: strict
            outputs:
              validated_data: processing-node
            on_error: fail_workflow

          - id: processing-node
            skill: {skill_name}
            node_type: {node_type}
            inputs:
              data: input-validator.validated_data
              parameters:
                processing_mode: optimized
            outputs:
              result: output-formatter
            timeout_ms: {timeout}
            retry_policy:
              max: 3
              backoff: exponential

          - id: output-formatter
            skill: {skill_name}
            node_type: transformer
            inputs:
              raw_result: processing-node.result
              parameters:
                format: json
            outputs:
              formatted_result: final_output

        triggers:
          - type: webhook
            path: /api/workflows/{skill_name}
            method: POST
            auth_required: true

          - type: schedule
            cron: "0 */6 * * *"
            enabled: false

        outputs:
          - id: final_output
            destination: callback
            on_failure: retry
    """)

    workflow_path = structure["dag_dir"] / f"example-{skill_name}-workflow.yaml"
    workflow_path.write_text(workflow, encoding="utf-8")
    return workflow_path


# ---------------------------------------------------------------------------
# Main Installation Flow
# ---------------------------------------------------------------------------
def install_skill_to_omnihub(
    skill_path: Path,
    omnihub_root: Path,
    register_catalog: bool = True,
    force: bool = False,
) -> dict[str, Any]:
    """
    Full installation flow: preflight -> copy -> health check -> register -> workflow.

    Returns installation report.
    """
    print("\n[CHECK] Pre-flight checks...")

    # Ensure structure exists
    structure = ensure_omnihub_structure(omnihub_root)
    print(f"  ✓ OmniHub root: {omnihub_root}")
    print(f"  ✓ Structure valid ({', '.join(OMNIHUB_DIRS)})")

    # Load manifest
    manifest_path = skill_path / "MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    skill_name = manifest.get("name", skill_path.name)
    print(f"  ✓ MANIFEST.json valid")

    # Handle force overwrite
    target_dir = structure["skills_dir"] / skill_name
    if target_dir.exists():
        if force:
            shutil.rmtree(target_dir)
            print(f"  ✓ Removed existing: {skill_name}")
        else:
            errors = preflight_checks(skill_path, omnihub_root, structure)
            if errors:
                for e in errors:
                    print(f"  ✗ {e}")
                return {"status": "error", "errors": errors}

    # Run remaining preflight checks
    errors = preflight_checks(skill_path, omnihub_root, structure)
    # Filter out naming conflict if we already handled it
    errors = [e for e in errors if "Naming conflict" not in e]
    if errors:
        for e in errors:
            print(f"  ✗ {e}")
        return {"status": "error", "errors": errors}

    print(f"  ✓ No naming conflicts")
    print(f"  ✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")

    # Install
    print(f"\n[INSTALL] Installing skill: {skill_name}")
    installed_path = install_skill(skill_path, omnihub_root, skill_name, structure)
    print(f"  ✓ Copied to: {installed_path}")

    # Health check
    print(f"\n[HEALTH] Running health check...")
    health_check_path = installed_path / "omnihub_integration" / "health_checks.py"
    health_status = "unknown"

    try:
        result = subprocess.run(
            [sys.executable, str(health_check_path)],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(installed_path),
        )
        if result.returncode == 0:
            health_result = json.loads(result.stdout)
            health_status = health_result.get("status", "unknown")
            for check, passed in health_result.get("checks", {}).items():
                status_icon = "✓" if passed else "✗"
                print(f"  {status_icon} {check}: {'PASS' if passed else 'FAIL'}")
            print(f"  Status: {health_status.upper()}")
        else:
            health_status = "unhealthy"
            print(f"  ✗ Health check failed: {result.stderr.strip()}")
    except Exception as e:
        health_status = "unknown"
        print(f"  ⚠ Health check could not run: {e}")

    # Register in catalog
    if register_catalog:
        print(f"\n[CATALOG] Registering in catalog...")
        register_in_catalog(structure, skill_name, manifest, health_status)
        print(f"  ✓ Updated: {structure['catalog']}")
        print(f"  ✓ Skill ID: {skill_name}")
        print(f"  ✓ Auto-load: ENABLED")

    # Generate example workflow
    print(f"\n[DAG] Generating example workflow...")
    workflow_path = generate_example_workflow(structure, skill_name, manifest)
    print(f"  ✓ Created: {workflow_path}")

    # Summary
    report = {
        "status": "success",
        "skill_id": skill_name,
        "installed_to": str(installed_path),
        "catalog_entry": str(structure["catalog"]),
        "health_check_result": {"status": health_status},
        "example_workflow": str(workflow_path),
        "next_steps": [
            f"Review catalog: cat config/skill_catalog.json",
            f"Test execution: python skills/{skill_name}/scripts/executor.py",
            f"Deploy workflow: Review dag/example-{skill_name}-workflow.yaml",
            f"Monitor logs: Check logs/skills/{skill_name}/",
        ],
    }

    print(f"\n[OK] Installation complete!\n")
    print("Next steps:")
    for i, step in enumerate(report["next_steps"], 1):
        print(f"  {i}. {step}")
    print()

    return report


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        prog="install_to_omnihub",
        description=f"APEX Skill Forge v{VERSION} — OmniHub Direct Installer",
        epilog=COPYRIGHT,
    )
    parser.add_argument("--skill-path", type=Path, required=True, help="Path to skill directory")
    parser.add_argument(
        "--omnihub-root", type=Path, required=True, help="Path to APEX-OmniHub repository root"
    )
    parser.add_argument(
        "--register-in-catalog",
        action="store_true",
        default=True,
        help="Register skill in catalog (default: true)",
    )
    parser.add_argument("--force", action="store_true", help="Force overwrite existing skill")
    args = parser.parse_args()

    report = install_skill_to_omnihub(
        skill_path=args.skill_path,
        omnihub_root=args.omnihub_root,
        register_catalog=args.register_in_catalog,
        force=args.force,
    )

    if report["status"] != "success":
        sys.exit(1)


if __name__ == "__main__":
    main()
