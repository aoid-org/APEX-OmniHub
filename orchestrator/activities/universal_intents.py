"""
Universal Intent Activities — Production-Ready Activities for the USO.

These activities are registered with BOTH Temporal (@activity.defn) and the
Intent Registry (@registry.register_intent). They serve as first-class
intent-routable activities, verifiable end-to-end through the
UniversalOrchestratorWorkflow → IntentRegistry → Activity chain.

Each activity follows the standard contract:
  Input:  dict[str, Any] (the EventEnvelope.payload forwarded by the workflow)
  Output: dict[str, Any] (wrapped into OmniModalSchema by the workflow)
"""

import platform
from datetime import datetime, timezone
from typing import Any

from temporalio import activity

from core.intent_registry import registry

# UTC offset replaced by Zulu suffix for ISO 8601 compliance
_UTC_OFFSET = "+00:00"
_ZULU_SUFFIX = "Z"

# ruff: noqa: ARG001  — params is required by the Temporal activity interface contract


# ── 1. System Health Check ────────────────────────────────────────────
# Verifiable via: POST /api/v1/intents { intent_id: "system.health_check" }


@registry.register_intent("system.health_check")
@activity.defn(name="system_health_check")
async def system_health_check(params: dict[str, Any]) -> dict[str, Any]:
    """Return system health status.

    A lightweight activity that confirms the full USO pipeline is
    executing: Edge → server.py → Temporal → registry → activity → response.
    """
    activity.logger.info("system.health_check: executing")
    return {
        "healthy": True,
        "python_version": platform.python_version(),
        "timestamp": datetime.now(timezone.utc).isoformat().replace(_UTC_OFFSET, _ZULU_SUFFIX),
        "worker_hostname": platform.node(),
    }


# ── 2. Echo Activity ─────────────────────────────────────────────────
# Verifiable via: POST /api/v1/intents { intent_id: "system.echo", payload: { message: "hello" } }


@registry.register_intent("system.echo")
@activity.defn(name="system_echo")
async def system_echo(params: dict[str, Any]) -> dict[str, Any]:
    """Echo back the input payload — confirms payload passthrough integrity.

    The workflow passes EventEnvelope.payload to this activity. The
    activity echoes it back, proving the full serialization chain is
    intact across TS → HTTP → Pydantic → Temporal → Activity → response.
    """
    activity.logger.info("system.echo: received payload with %d keys", len(params))
    return {
        "echoed": True,
        "received_keys": sorted(params.keys()),
        "payload": params,
        "timestamp": datetime.now(timezone.utc).isoformat().replace(_UTC_OFFSET, _ZULU_SUFFIX),
    }


# ── 3. Intent Catalog ────────────────────────────────────────────────
# Verifiable via: POST /api/v1/intents { intent_id: "system.list_intents" }


@registry.register_intent("system.list_intents")
@activity.defn(name="system_list_intents")
async def system_list_intents(params: dict[str, Any]) -> dict[str, Any]:
    """Return all registered intents from the Universal Intent Registry.

    Useful for frontend discovery: the UI can call this to learn which
    intents the orchestrator supports without hardcoding them.
    """
    activity.logger.info("system.list_intents: listing registry")
    return {
        "intents": registry.list_intents(),
        "count": len(registry),
        "timestamp": datetime.now(timezone.utc).isoformat().replace(_UTC_OFFSET, _ZULU_SUFFIX),
    }
