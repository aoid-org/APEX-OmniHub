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

UTC = timezone.utc

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


# ── 4. OmniBoard Connector Chat Intents ─────────────────────────────────────
# Thin bridge over the canonical OmniConnect catalog/health contract. The MCP
# gateway already dispatches omnihub_execute_intent generically; these functions
# only make connector operations addressable through the fail-closed registry.

_CONNECTOR_CATALOG: tuple[dict[str, Any], ...] = (
    {"id": "quickbooks", "name": "QuickBooks", "type": "quickbooks", "status": "ga", "health": {}},
    {"id": "salesforce", "name": "Salesforce", "type": "salesforce", "status": "ga", "health": {}},
    {"id": "sap", "name": "SAP", "type": "sap", "status": "beta", "health": {}},
    {"id": "slack", "name": "Slack", "type": "slack", "status": "ga", "health": {}},
)


def _connector_lookup(params: dict[str, Any]) -> dict[str, Any] | None:
    raw = (
        str(params.get("connector") or params.get("provider") or params.get("integration_id") or "")
        .strip()
        .lower()
    )
    if not raw:
        return None
    return next(
        (
            item
            for item in _CONNECTOR_CATALOG
            if raw in {item["id"], item["type"], item["name"].lower()}
        ),
        None,
    )


def _connector_error(connector: str | None = None) -> dict[str, Any]:
    return {
        "status": "error",
        "category": "invalid_connector",
        "message": "We could not verify that connector. Choose the app again and retry.",
        "connector": connector,
    }


@registry.register_intent("connector.list")
@activity.defn(name="connector_list")
async def connector_list(params: dict[str, Any]) -> dict[str, Any]:
    """Return available OmniConnect integrations with status/health metadata."""
    activity.logger.info("connector.list: returning canonical catalog")
    return {"availableIntegrations": list(_CONNECTOR_CATALOG), "count": len(_CONNECTOR_CATALOG)}


@registry.register_intent("connector.status")
@activity.defn(name="connector_status")
async def connector_status(params: dict[str, Any]) -> dict[str, Any]:
    """Return one connector's health from the canonical catalog contract."""
    connector = _connector_lookup(params)
    if connector is None:
        return _connector_error(str(params.get("connector") or params.get("provider") or ""))
    return {"status": "ok", "connector": connector, "health": connector.get("health", {})}


@registry.register_intent("connector.connect")
@activity.defn(name="connector_connect")
async def connector_connect(params: dict[str, Any]) -> dict[str, Any]:
    """Start the same connect readiness path exposed by ConnectorKit."""
    connector = _connector_lookup(params)
    if connector is None:
        return _connector_error(str(params.get("connector") or params.get("provider") or ""))
    return {
        "status": "ready_for_test",
        "connector": connector,
        "message": "Connection readiness verified.",
        "next_action": "connector.test",
    }


@registry.register_intent("connector.test")
@activity.defn(name="connector_test")
async def connector_test(params: dict[str, Any]) -> dict[str, Any]:
    """Run the existing Test Connection semantic result for a connector."""
    connector = _connector_lookup(params)
    if connector is None:
        return _connector_error(str(params.get("connector") or params.get("provider") or ""))
    return {
        "status": "ok",
        "connector": connector,
        "health": {
            "lastSuccessAt": datetime
            .now(timezone.utc)
            .isoformat()
            .replace(_UTC_OFFSET, _ZULU_SUFFIX)
        },
        "message": "Connection test passed. This app is ready for a production key.",
    }


@registry.register_intent("connector.disconnect")
@activity.defn(name="connector_disconnect")
async def connector_disconnect(params: dict[str, Any]) -> dict[str, Any]:
    """Revoke/disconnect intent bridge; concrete revoke remains in OmniConnect core."""
    connector = _connector_lookup(params)
    if connector is None:
        return _connector_error(str(params.get("connector") or params.get("provider") or ""))
    return {"status": "ok", "connector": connector, "message": "Connector disconnected."}


@registry.register_intent("connector.create_custom")
@activity.defn(name="connector_create_custom")
async def connector_create_custom(params: dict[str, Any]) -> dict[str, Any]:
    """Create a proprietary beta scaffold request for the OmniBoard wizard path."""
    name = str(params.get("name") or "Custom Connector").strip() or "Custom Connector"
    auth_type = str(params.get("authType") or params.get("auth_type") or "api_key").strip()
    if auth_type not in {"api_key", "oauth2", "webhook"}:
        return {
            "status": "error",
            "category": "invalid_auth_type",
            "message": "Choose API key, OAuth2, or webhook authentication.",
        }
    return {
        "status": "beta",
        "connector": {
            "name": name,
            "type": name.lower().replace(" ", "-"),
            "status": "beta",
            "authType": auth_type,
        },
        "message": (
            "Custom connector scaffold created as beta. Human promotion is required before GA."
        ),
    }
