#!/usr/bin/env python3
"""
OmniHub Health Check — APEX Skill Forge v8.0
Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.

Validates runtime readiness and DAG compatibility for OmniHub integration.
Exit code: 0 = healthy, 1 = unhealthy/degraded.

Usage:
    python health_checks.py
"""

from __future__ import annotations

import inspect
import json
import sys
from pathlib import Path
from typing import Any


def health_check() -> dict[str, Any]:
    """
    Performs 4-point health check for OmniHub integration.

    Returns:
        {
            "status": "healthy|degraded|unhealthy",
            "checks": {
                "executor_import": bool,
                "dependencies": bool,
                "manifest_valid": bool,
                "dag_compatible": bool
            },
            "message": str
        }
    """
    checks: dict[str, bool] = {}

    # Check 1: Can import executor
    try:
        scripts_dir = Path(__file__).parent.parent / "scripts"
        sys.path.insert(0, str(scripts_dir))
        from executor import execute  # type: ignore[import-not-found]

        checks["executor_import"] = True
    except ImportError as e:
        checks["executor_import"] = False
        return {
            "status": "unhealthy",
            "checks": checks,
            "message": f"Executor import failed: {e}",
        }

    # Check 2: Dependencies available (stdlib only for forge)
    try:
        import hashlib  # noqa: F401
        import signal  # noqa: F401
        import time  # noqa: F401

        checks["dependencies"] = True
    except ImportError as e:
        checks["dependencies"] = False
        return {
            "status": "degraded",
            "checks": checks,
            "message": f"Dependency missing: {e}",
        }

    # Check 3: Manifest valid
    manifest_path = Path(__file__).parent.parent / "MANIFEST.json"
    try:
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)
            assert manifest.get("dag", {}).get("omnihub_compatible") is True, (
                "dag.omnihub_compatible must be true"
            )
            assert "name" in manifest, "name field required"
            assert "version" in manifest, "version field required"
        checks["manifest_valid"] = True
    except FileNotFoundError:
        checks["manifest_valid"] = False
        return {
            "status": "unhealthy",
            "checks": checks,
            "message": f"MANIFEST.json not found at {manifest_path}",
        }
    except (json.JSONDecodeError, AssertionError) as e:
        checks["manifest_valid"] = False
        return {
            "status": "unhealthy",
            "checks": checks,
            "message": f"Manifest invalid: {e}",
        }

    # Check 4: DAG signature compatible
    try:
        sig = inspect.signature(execute)
        params = list(sig.parameters.keys())
        if "input_context" in params:
            checks["dag_compatible"] = True
        else:
            checks["dag_compatible"] = False
            return {
                "status": "unhealthy",
                "checks": checks,
                "message": f"Executor signature incompatible. Params: {params}",
            }
    except Exception as e:
        checks["dag_compatible"] = False
        return {
            "status": "unhealthy",
            "checks": checks,
            "message": f"Signature inspection failed: {e}",
        }

    return {
        "status": "healthy",
        "checks": checks,
        "message": "All checks passed",
    }


if __name__ == "__main__":
    result = health_check()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["status"] == "healthy" else 1)
