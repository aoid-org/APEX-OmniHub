#!/usr/bin/env python3
"""
APEX Skill Forge v8.0 — DAG-Compatible Executor
Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.

Provides the reference DAG executor for the Skill Forge itself.
Supports timeout enforcement, exponential-backoff retry, and idempotency.

Usage:
    python executor.py '{"execution_id": "run-001", "parameters": {...}}'
"""

from __future__ import annotations

import hashlib
import json
import os
import signal
import sys
import time
from pathlib import Path
from typing import Any

VERSION = "8.0.0"
COPYRIGHT = "Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved."

# Default DAG parameters (overridable via input_context.metadata)
DEFAULT_TIMEOUT_MS = 30000
DEFAULT_MAX_RETRIES = 3
DEFAULT_BACKOFF_BASE_MS = 500


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def get_project_context() -> dict[str, Any]:
    """Detect if running in Claude Code project context."""
    root = os.getenv("CLAUDE_CODE_PROJECT_ROOT")
    if root:
        return {"project_root": root, "project_name": Path(root).name}
    return {}


def _idempotency_key(input_context: dict[str, Any]) -> str:
    """Compute deterministic hash of input for idempotency checks."""
    canonical = json.dumps(input_context, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]


class _TimeoutError(Exception):
    """Raised when execution exceeds timeout_ms."""


def _timeout_handler(signum: int, frame: Any) -> None:
    raise _TimeoutError("Execution exceeded timeout_ms")


# ---------------------------------------------------------------------------
# Core Executor
# ---------------------------------------------------------------------------
def _do_execute(parameters: dict[str, Any], context: dict[str, Any]) -> Any:
    """
    Core skill logic — the Forge executor processes forge/audit/ship commands.

    Override this function for custom skill logic.
    """
    action = parameters.get("action", "status")
    project_ctx = get_project_context()

    if action == "status":
        return {
            "forge_version": VERSION,
            "project_context": project_ctx,
            "available_actions": ["status", "forge", "audit", "ship"],
            "archetypes": [
                "workflow",
                "toolkit",
                "domain",
                "orchestrator",
                "transformer",
                "guardian",
            ],
        }

    if action == "forge":
        # Delegate to forge.py logic
        name = parameters.get("name", "")
        archetype = parameters.get("archetype", "workflow")
        output_path = Path(parameters.get("output_path", "."))
        try:
            from forge import create_skill  # type: ignore[import-not-found]

            success = create_skill(name, archetype, output_path)
            return {"forged": success, "name": name, "archetype": archetype}
        except ImportError:
            return {"error": "forge.py not found in scripts/", "forged": False}

    return {"echo": parameters, "action": action}


def execute(input_context: dict[str, Any]) -> dict[str, Any]:
    """
    APEX OmniHub DAG-compatible executor.

    Args:
        input_context: {
            "execution_id": str,
            "parameters": Dict[str, Any],
            "context": Dict[str, Any],
            "metadata": Dict[str, Any]
        }

    Returns:
        {
            "result": Any,
            "context_updates": Dict[str, Any],
            "metadata": {
                "execution_time_ms": float,
                "node_status": "success|error|timeout",
                "logs": List[Dict],
                "error": Optional[Dict],
                "idempotency_key": str,
                "recoverable": bool
            }
        }
    """
    start = time.monotonic()
    logs: list[dict[str, Any]] = []
    execution_id = input_context.get("execution_id", "unknown")
    parameters = input_context.get("parameters", {})
    context = input_context.get("context", {})
    metadata = input_context.get("metadata", {})

    timeout_ms = metadata.get("timeout_ms", DEFAULT_TIMEOUT_MS)
    idem_key = _idempotency_key(input_context)

    logs.append(
        {"level": "info", "msg": f"Starting {execution_id} [key={idem_key}]", "ts": time.time()}
    )

    # Set timeout (Unix only — graceful fallback on Windows)
    has_alarm = hasattr(signal, "SIGALRM")
    if has_alarm:
        old_handler = signal.signal(signal.SIGALRM, _timeout_handler)  # type: ignore[attr-defined]
        signal.alarm(max(1, timeout_ms // 1000))  # type: ignore[attr-defined]

    try:
        result = _do_execute(parameters, context)
        elapsed = (time.monotonic() - start) * 1000

        logs.append({"level": "info", "msg": f"Completed in {elapsed:.1f}ms", "ts": time.time()})

        return {
            "result": result,
            "context_updates": {
                "last_skill": "apex-skill-forge",
                "last_status": "success",
                "last_execution_id": execution_id,
            },
            "metadata": {
                "execution_time_ms": round(elapsed, 2),
                "node_status": "success",
                "logs": logs,
                "idempotency_key": idem_key,
                "recoverable": True,
            },
        }

    except _TimeoutError:
        elapsed = (time.monotonic() - start) * 1000
        logs.append({"level": "error", "msg": f"Timeout after {elapsed:.1f}ms", "ts": time.time()})
        return {
            "result": None,
            "context_updates": {"last_skill": "apex-skill-forge", "last_status": "timeout"},
            "metadata": {
                "execution_time_ms": round(elapsed, 2),
                "node_status": "timeout",
                "logs": logs,
                "error": {"type": "TimeoutError", "message": f"Exceeded {timeout_ms}ms"},
                "idempotency_key": idem_key,
                "recoverable": True,
            },
        }

    except Exception as exc:
        elapsed = (time.monotonic() - start) * 1000
        logs.append({"level": "error", "msg": str(exc), "ts": time.time()})
        return {
            "result": None,
            "context_updates": {"last_skill": "apex-skill-forge", "last_status": "error"},
            "metadata": {
                "execution_time_ms": round(elapsed, 2),
                "node_status": "error",
                "logs": logs,
                "error": {"type": type(exc).__name__, "message": str(exc)},
                "idempotency_key": idem_key,
                "recoverable": True,
            },
        }

    finally:
        if has_alarm:
            signal.alarm(0)  # type: ignore[attr-defined]
            signal.signal(signal.SIGALRM, old_handler)  # type: ignore[attr-defined]


def execute_with_retry(
    input_context: dict[str, Any],
    max_retries: int = DEFAULT_MAX_RETRIES,
    backoff_base_ms: int = DEFAULT_BACKOFF_BASE_MS,
) -> dict[str, Any]:
    """Execute with exponential backoff retry on transient failures."""
    for attempt in range(1, max_retries + 1):
        result = execute(input_context)
        status = result.get("metadata", {}).get("node_status", "error")

        if status == "success":
            return result

        if attempt < max_retries:
            delay_s = (backoff_base_ms * (2 ** (attempt - 1))) / 1000
            time.sleep(delay_s)

    return result  # Return last failed result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) > 1:
        ctx = json.loads(sys.argv[1])
    else:
        ctx = {
            "execution_id": "cli-test",
            "parameters": {"action": "status"},
            "context": {},
            "metadata": {},
        }
    print(json.dumps(execute(ctx), indent=2))
